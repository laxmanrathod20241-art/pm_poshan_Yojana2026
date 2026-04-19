-- PM-POSHAN TRACKER: SAAS ADMINISTRATION MIGRATION
-- Objective: Enabling Pricing Management, Coupons, and Subscription CRM

-- 1. SAAS PRICING CONFIGURATION
CREATE TABLE IF NOT EXISTS saas_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_type TEXT UNIQUE NOT NULL, -- 'primary', 'upper_primary', 'combo'
    base_price NUMERIC NOT NULL DEFAULT 800,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Initial Seed Data
INSERT INTO saas_pricing (section_type, base_price, description)
VALUES 
    ('primary', 800, 'इ. १ ते ५ वी शिक्षक वार्षिक शुल्क'),
    ('upper_primary', 800, 'इ. ६ ते ८ वी शिक्षक वार्षिक शुल्क'),
    ('combo', 1200, 'इ. १ ते ८ वी शिक्षक वार्षिक शुल्क (Combo Package)')
ON CONFLICT (section_type) DO NOTHING;

-- 2. SAAS COUPONS & AFFILIATES
CREATE TABLE IF NOT EXISTS saas_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    discount_percent NUMERIC NOT NULL DEFAULT 5,
    promoter_name TEXT,
    usage_limit INTEGER, -- NULL for unlimited
    usage_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. SAAS SUBSCRIPTIONS (Transaction Ledger)
CREATE TABLE IF NOT EXISTS saas_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL, -- 'primary', 'upper_primary', 'combo'
    amount_paid NUMERIC NOT NULL,
    coupon_used TEXT,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    payment_status TEXT DEFAULT 'unpaid', -- 'paid', 'unpaid', 'expired'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. UPDATE PROFILES FOR SaaS ACCESS
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS saas_plan_type TEXT DEFAULT 'primary',
ADD COLUMN IF NOT EXISTS saas_payment_status TEXT DEFAULT 'unpaid',
ADD COLUMN IF NOT EXISTS saas_amount_paid NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS saas_expiry_date TIMESTAMPTZ;

-- 5. ACCESS CONTROL (RLS)
ALTER TABLE saas_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE saas_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE saas_subscriptions ENABLE ROW LEVEL SECURITY;

-- Master Admin full access
CREATE POLICY "Master admin bypass saas_pricing" ON saas_pricing FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'master');
CREATE POLICY "Master admin bypass saas_coupons" ON saas_coupons FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'master');
CREATE POLICY "Master admin bypass saas_subscriptions" ON saas_subscriptions FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'master');

-- Teacher Read-Only access for pricing (for checkout)
CREATE POLICY "Teachers can view pricing" ON saas_pricing FOR SELECT TO authenticated USING (true);
