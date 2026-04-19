-- ==========================================
-- PM-POSHAN TRACKER: GENESIS MASTER SCHEMA
-- Project ID: mlammuevxjrnjbpwuzoe
-- Objective: Full Database Initialization
-- ==========================================

-- 0. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. BASE TABLES
CREATE TABLE IF NOT EXISTS public.schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'teacher', -- 'teacher', 'master'
    first_name TEXT,
    last_name TEXT,
    school_name TEXT,
    school_id UUID REFERENCES public.schools(id),
    school_name_mr TEXT,
    center_name_mr TEXT,
    has_primary BOOLEAN DEFAULT true,
    has_upper_primary BOOLEAN DEFAULT false,
    is_onboarded BOOLEAN DEFAULT false,
    onboarding_step INTEGER DEFAULT 1,
    -- SaaS Columns
    saas_plan_type TEXT DEFAULT 'primary',
    saas_payment_status TEXT DEFAULT 'unpaid',
    saas_amount_paid NUMERIC DEFAULT 0,
    saas_expiry_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. CORE OPERATIONAL TABLES
CREATE TABLE IF NOT EXISTS public.daily_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    meals_served_primary INTEGER DEFAULT 0,
    meals_served_upper_primary INTEGER DEFAULT 0,
    is_holiday BOOLEAN DEFAULT false,
    holiday_remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(teacher_id, log_date)
);

CREATE TABLE IF NOT EXISTS public.student_enrollment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    std_1 INTEGER DEFAULT 0,
    std_2 INTEGER DEFAULT 0,
    std_3 INTEGER DEFAULT 0,
    std_4 INTEGER DEFAULT 0,
    std_5 INTEGER DEFAULT 0,
    std_6 INTEGER DEFAULT 0,
    std_7 INTEGER DEFAULT 0,
    std_8 INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(teacher_id)
);

CREATE TABLE IF NOT EXISTS public.menu_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    item_code TEXT NOT NULL,
    grams_primary NUMERIC DEFAULT 0,
    grams_upper_primary NUMERIC DEFAULT 0,
    item_category TEXT, -- 'grain', 'spice', 'oil', etc.
    source TEXT DEFAULT 'local',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(teacher_id, item_code)
);

CREATE TABLE IF NOT EXISTS public.inventory_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    item_code TEXT,
    current_balance NUMERIC NOT NULL DEFAULT 0,
    standard_group TEXT, -- 'primary', 'upper_primary'
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(teacher_id, item_name, standard_group)
);

CREATE TABLE IF NOT EXISTS public.stock_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    quantity_kg NUMERIC NOT NULL,
    receipt_date DATE NOT NULL,
    bill_no TEXT,
    standard_group TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.consumption_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    meals_served_primary INTEGER DEFAULT 0,
    meals_served_upper_primary INTEGER DEFAULT 0,
    main_food TEXT,
    main_foods_all TEXT[],
    ingredients_used TEXT[],
    is_overridden BOOLEAN DEFAULT false,
    standard_group TEXT,
    original_template JSONB,
    borrowed_items JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. MASTER DATA
CREATE TABLE IF NOT EXISTS public.global_food_master (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_en TEXT,
    item_category TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. ADDITIONAL TEACHER SETTINGS
CREATE TABLE IF NOT EXISTS public.menu_weekly_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    day_name TEXT NOT NULL,
    week_pattern TEXT NOT NULL, -- 'regular', 'alternate'
    main_food_codes TEXT[],
    menu_items TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(teacher_id, day_name, week_pattern)
);

-- 5. REPORTING & SNAPSHOTS
CREATE TABLE IF NOT EXISTS public.monthly_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    report_month INTEGER NOT NULL,
    report_year INTEGER NOT NULL,
    report_data JSONB,
    daily_ledger_data JSONB,
    standard_group TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(teacher_id, report_month, report_year, standard_group)
);

CREATE TABLE IF NOT EXISTS public.financial_ledger_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    fiscal_year INTEGER NOT NULL,
    section_type TEXT DEFAULT 'primary',
    ledger_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (teacher_id, fiscal_year, section_type)
);

CREATE TABLE IF NOT EXISTS public.payment_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receipt_date DATE NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    section_type TEXT DEFAULT 'primary',
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. SAAS ADMINISTRATION LAYER
CREATE TABLE IF NOT EXISTS public.saas_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_type TEXT UNIQUE NOT NULL,
    base_price NUMERIC NOT NULL DEFAULT 800,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.saas_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    discount_percent NUMERIC NOT NULL DEFAULT 5,
    promoter_name TEXT,
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.saas_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL,
    amount_paid NUMERIC NOT NULL,
    payment_status TEXT DEFAULT 'unpaid',
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_enrollment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumption_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_weekly_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_ledger_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_pricing ENABLE ROW LEVEL SECURITY;

-- Dynamic Policy Generator for Teacher Tables
DO $$
DECLARE
  v_table_name TEXT;
  v_tables TEXT[] := ARRAY[
    'daily_logs', 
    'menu_master', 
    'inventory_stock', 
    'stock_receipts', 
    'consumption_logs', 
    'menu_weekly_schedule', 
    'monthly_reports', 
    'student_enrollment',
    'financial_ledger_snapshots',
    'payment_receipts'
  ];
BEGIN
  FOREACH v_table_name IN ARRAY v_tables
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Policy_%I_owner" ON public.%I', v_table_name, v_table_name);
    EXECUTE format(
      'CREATE POLICY "Policy_%I_owner" ON public.%I 
       FOR ALL TO authenticated 
       USING (auth.uid() = teacher_id) 
       WITH CHECK (auth.uid() = teacher_id)', 
      v_table_name, v_table_name
    );
  END LOOP;
END $$;

-- Specialized Policies
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admin full access profiles" ON public.profiles;
CREATE POLICY "Admin full access profiles" ON public.profiles FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'master');

DROP POLICY IF EXISTS "Teachers can update own profile" ON public.profiles;
CREATE POLICY "Teachers can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Teachers can insert own profile" ON public.profiles;
CREATE POLICY "Teachers can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Public read saas_pricing" ON public.saas_pricing;
CREATE POLICY "Public read saas_pricing" ON public.saas_pricing FOR SELECT TO authenticated USING (true);

-- 9. AUTOMATED PROFILE PROVISIONING
-- This ensures every new Auth user gets a public profile with a default 'teacher' role.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'teacher');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET row_security = OFF;

-- Trigger to run on every new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 10. ATOMIC TRANSACTION FOR DAILY CONSUMPTION
-- Hardened with fixed search_path to resolve security lint issues.
CREATE OR REPLACE FUNCTION public.process_daily_consumption(
  p_teacher_id UUID,
  p_log_date DATE,
  p_is_holiday BOOLEAN,
  p_holiday_remarks TEXT,
  p_meals_primary INTEGER,
  p_meals_upper INTEGER,
  p_main_foods TEXT[],
  p_ingredients TEXT[],
  p_is_overridden BOOLEAN,
  p_original_template JSONB,
  p_grams_primary JSONB,
  p_grams_upper JSONB
)
RETURNS VOID AS $$
DECLARE
  v_old_log RECORD;
  v_item TEXT;
  v_grams REAL;
  v_restore_kg REAL;
  v_deduct_kg REAL;
BEGIN
  -- 1. RESTORE INVENTORY
  FOR v_old_log IN 
    SELECT * FROM public.consumption_logs 
    WHERE teacher_id = p_teacher_id AND log_date = p_log_date
  LOOP
    FOR v_item IN SELECT unnest(array_cat(v_old_log.main_foods_all, v_old_log.ingredients_used))
    LOOP
      IF v_old_log.standard_group = 'primary' THEN
        v_grams := (p_grams_primary->>v_item)::REAL;
        v_restore_kg := (v_old_log.meals_served_primary * COALESCE(v_grams, 100)) / 1000.0;
      ELSE
        v_grams := (p_grams_upper->>v_item)::REAL;
        v_restore_kg := (v_old_log.meals_served_upper_primary * COALESCE(v_grams, 150)) / 1000.0;
      END IF;

      IF v_restore_kg > 0 THEN
        UPDATE public.inventory_stock 
        SET current_balance = current_balance + v_restore_kg
        WHERE teacher_id = p_teacher_id 
          AND (item_name = v_item OR item_code = v_item)
          AND standard_group = v_old_log.standard_group;
      END IF;
    END LOOP;
  END LOOP;

  -- 2. CLEAR OLD STATE
  DELETE FROM public.consumption_logs WHERE teacher_id = p_teacher_id AND log_date = p_log_date;

  -- 3. APPLY NEW CONSUMPTION
  IF NOT p_is_holiday THEN
    IF p_meals_primary > 0 THEN
      INSERT INTO public.consumption_logs (
        teacher_id, log_date, meals_served_primary, meals_served_upper_primary, 
        main_food, main_foods_all, ingredients_used, is_overridden, 
        original_template, standard_group
      ) VALUES (
        p_teacher_id, p_log_date, p_meals_primary, 0, 
        p_main_foods[1], p_main_foods, p_ingredients, p_is_overridden, 
        p_original_template, 'primary'
      );

      FOR v_item IN SELECT unnest(array_cat(p_main_foods, p_ingredients))
      LOOP
        v_grams := (p_grams_primary->>v_item)::REAL;
        v_deduct_kg := (p_meals_primary * COALESCE(v_grams, 100)) / 1000.0;
        IF v_deduct_kg > 0 THEN
          UPDATE public.inventory_stock 
          SET current_balance = current_balance - v_deduct_kg
          WHERE teacher_id = p_teacher_id 
            AND (item_name = v_item OR item_code = v_item)
            AND standard_group = 'primary';
        END IF;
      END LOOP;
    END IF;

    IF p_meals_upper > 0 THEN
      INSERT INTO public.consumption_logs (
        teacher_id, log_date, meals_served_primary, meals_served_upper_primary, 
        main_food, main_foods_all, ingredients_used, is_overridden, 
        original_template, standard_group
      ) VALUES (
        p_teacher_id, p_log_date, 0, p_meals_upper, 
        p_main_foods[1], p_main_foods, p_ingredients, p_is_overridden, 
        p_original_template, 'upper_primary'
      );

      FOR v_item IN SELECT unnest(array_cat(p_main_foods, p_ingredients))
      LOOP
        v_grams := (p_grams_upper->>v_item)::REAL;
        v_deduct_kg := (p_meals_upper * COALESCE(v_grams, 150)) / 1000.0;
        IF v_deduct_kg > 0 THEN
          UPDATE public.inventory_stock 
          SET current_balance = current_balance - v_deduct_kg
          WHERE teacher_id = p_teacher_id 
            AND (item_name = v_item OR item_code = v_item)
            AND standard_group = 'upper_primary';
        END IF;
      END LOOP;
    END IF;
  END IF;

  -- 4. UPSERT ATTENDANCE LOG
  INSERT INTO public.daily_logs (
    teacher_id, log_date, meals_served_primary, meals_served_upper_primary, 
    is_holiday, holiday_remarks
  ) VALUES (
    p_teacher_id, p_log_date, p_meals_primary, p_meals_upper, 
    p_is_holiday, p_holiday_remarks
  )
  ON CONFLICT (teacher_id, log_date) DO UPDATE SET
    meals_served_primary = EXCLUDED.meals_served_primary,
    meals_served_upper_primary = EXCLUDED.meals_served_upper_primary,
    is_holiday = EXCLUDED.is_holiday,
    holiday_remarks = EXCLUDED.holiday_remarks;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

-- 8. INITIAL SEED DATA
INSERT INTO public.saas_pricing (section_type, base_price, description)
VALUES 
    ('primary', 800, 'इ. १ ते ५ वी शिक्षक वार्षिक शुल्क'),
    ('upper_primary', 800, 'इ. ६ ते ८ वी शिक्षक वार्षिक शुल्क'),
    ('combo', 1200, 'इ. १ ते ८ वी शिक्षक वार्षिक शुल्क (Combo Package)')
ON CONFLICT (section_type) DO NOTHING;
