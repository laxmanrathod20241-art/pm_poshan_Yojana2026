-- SECURITY HARDENING & MULTI-TENANT ISOLATION
-- Project: PM-POSHAN Tracker
-- Objective: 100% Data Isolation via Supabase RLS

-- 1. PROFILES Table (auth.uid() matches id)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only view their own profile" ON profiles;
CREATE POLICY "Users can only view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can only update their own profile" ON profiles;
CREATE POLICY "Users can only update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 2. GLOBAL FOOD MASTER (Read-only for all authenticated users)
ALTER TABLE global_food_master ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Global Food Master is readable by all" ON global_food_master;
CREATE POLICY "Global Food Master is readable by all" ON global_food_master
  FOR SELECT TO authenticated USING (true);

-- 3. TABLES FILTERED BY teacher_id (auth.uid() matches teacher_id)
-- We'll apply this to all tenant-specific tables.

DO $$
DECLARE
  v_table_name TEXT;
  v_tables TEXT[] := ARRAY[
    'inventory_stock', 
    'consumption_logs', 
    'monthly_reports', 
    'item_ledger_reports', 
    'demand_reports', 
    'daily_logs', 
    'menu_master', 
    'student_enrollment', 
    'cooking_staff', 
    'fuel_tracking', 
    'menu_weekly_schedule', 
    'local_food_master', 
    'stock_receipts'
  ];
BEGIN
  FOREACH v_table_name IN ARRAY v_tables
  LOOP
    -- Enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', v_table_name);
    
    -- Drop existing permissive policies
    EXECUTE format('DROP POLICY IF EXISTS "All operations locked to teacher_id" ON %I', v_table_name);
    
    -- Create strict policy
    EXECUTE format(
      'CREATE POLICY "All operations locked to teacher_id" ON %I 
       FOR ALL TO authenticated 
       USING (auth.uid() = teacher_id) 
       WITH CHECK (auth.uid() = teacher_id)', 
      v_table_name
    );
  END LOOP;
END $$;

-- 4. ENSURE SCOPED UNIQUE CONSTRAINTS
-- These ensure Teacher A and Teacher B can have identical records (like "Rice") without overlap.

-- menu_master
ALTER TABLE menu_master DROP CONSTRAINT IF EXISTS menu_master_teacher_id_item_code_key;
ALTER TABLE menu_master ADD CONSTRAINT menu_master_teacher_id_item_code_key UNIQUE (teacher_id, item_code);

-- menu_weekly_schedule
ALTER TABLE menu_weekly_schedule DROP CONSTRAINT IF EXISTS menu_weekly_schedule_teacher_id_day_pattern_key;
ALTER TABLE menu_weekly_schedule ADD CONSTRAINT menu_weekly_schedule_teacher_id_day_pattern_key UNIQUE (teacher_id, day_name, week_pattern);

-- local_food_master
ALTER TABLE local_food_master DROP CONSTRAINT IF EXISTS local_food_master_teacher_id_local_code_key;
ALTER TABLE local_food_master ADD CONSTRAINT local_food_master_teacher_id_local_code_key UNIQUE (teacher_id, local_code);

-- demand_reports (Already scoped but good to verify)
ALTER TABLE demand_reports DROP CONSTRAINT IF EXISTS demand_reports_teacher_date_group_key;
ALTER TABLE demand_reports ADD CONSTRAINT demand_reports_teacher_date_group_key UNIQUE (teacher_id, report_period, standard_group);

-- item_ledger_reports
ALTER TABLE item_ledger_reports DROP CONSTRAINT IF EXISTS item_ledger_reports_teacher_item_range_group_key;
ALTER TABLE item_ledger_reports ADD CONSTRAINT item_ledger_reports_teacher_item_range_group_key UNIQUE (teacher_id, item_name, date_range, standard_group);
