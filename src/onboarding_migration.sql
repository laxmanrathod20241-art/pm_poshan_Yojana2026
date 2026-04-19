-- MIGRATION: Onboarding System
-- Role: Senior Backend Engineer

-- 1. Add onboarding columns to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 1;

-- 2. Mark existing users as onboarded so their flow isn't interrupted
UPDATE profiles 
SET is_onboarded = TRUE 
WHERE role IS NOT NULL;

-- 3. Verify
COMMENT ON COLUMN profiles.is_onboarded IS 'Whether the school has completed the mandatory 6-step setup wizard.';
COMMENT ON COLUMN profiles.onboarding_step IS 'The current step (1-6) the user is on in the onboarding wizard.';
