-- PM-POSHAN TRACKER: CONSOLIDATED SCHEMA SYNC (v3.0 - JSONB FIX)
-- Objective: Add 'standard_group', update constraints, and fix type mismatch in RPC.
-- Instructions: Run this script in your Supabase SQL Editor.

-- 1. ADD 'standard_group' COLUMN TO ALL TABLES (IF MISSING)
DO $$
DECLARE
    v_table_name TEXT;
    v_tables TEXT[] := ARRAY[
        'inventory_stock', 'consumption_logs', 'monthly_reports', 
        'item_ledger_reports', 'stock_receipts', 'cooking_staff', 'fuel_tracking'
    ];
BEGIN
    FOREACH v_table_name IN ARRAY v_tables LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = v_table_name AND column_name = 'standard_group') THEN
            EXECUTE format('ALTER TABLE %I ADD COLUMN standard_group TEXT DEFAULT ''primary''', v_table_name);
        END IF;
    END LOOP;
END $$;

-- 2. INITIALIZE DATA
UPDATE inventory_stock SET standard_group = 'primary' WHERE standard_group IS NULL;
UPDATE consumption_logs SET standard_group = 'primary' WHERE standard_group IS NULL;
UPDATE monthly_reports SET standard_group = 'primary' WHERE standard_group IS NULL;
UPDATE item_ledger_reports SET standard_group = 'primary' WHERE standard_group IS NULL;
UPDATE stock_receipts SET standard_group = 'primary' WHERE standard_group IS NULL;
UPDATE cooking_staff SET standard_group = 'primary' WHERE standard_group IS NULL;
UPDATE fuel_tracking SET standard_group = 'primary' WHERE standard_group IS NULL;

-- 3. UPDATE UNIQUE CONSTRAINTS
ALTER TABLE inventory_stock DROP CONSTRAINT IF EXISTS inventory_stock_teacher_id_item_name_key;
ALTER TABLE inventory_stock ADD CONSTRAINT inventory_stock_teacher_item_group_unique UNIQUE (teacher_id, item_name, standard_group);

ALTER TABLE consumption_logs DROP CONSTRAINT IF EXISTS consumption_logs_teacher_id_log_date_key;
ALTER TABLE consumption_logs ADD CONSTRAINT consumption_logs_teacher_date_group_unique UNIQUE (teacher_id, log_date, standard_group);

ALTER TABLE monthly_reports DROP CONSTRAINT IF EXISTS monthly_reports_teacher_month_year_key;
ALTER TABLE monthly_reports ADD CONSTRAINT monthly_reports_teacher_month_year_group_unique UNIQUE (teacher_id, report_month, report_year, standard_group);

-- 4. ATOMIC RPC FUNCTION (With explicit JSONB casting for arrays)
CREATE OR REPLACE FUNCTION process_daily_consumption(
  p_teacher_id UUID, p_log_date DATE, p_is_holiday BOOLEAN, p_holiday_remarks TEXT,
  p_meals_primary INTEGER, p_meals_upper INTEGER, p_main_foods TEXT[], p_ingredients TEXT[],
  p_is_overridden BOOLEAN, p_original_template JSONB, p_grams_primary JSONB, p_grams_upper JSONB
)
RETURNS VOID AS $$
DECLARE
  v_old_log RECORD; v_item TEXT; v_grams REAL; v_restore_kg REAL; v_deduct_kg REAL;
BEGIN
  -- Restore Inventory
  FOR v_old_log IN SELECT * FROM consumption_logs WHERE teacher_id = p_teacher_id AND log_date = p_log_date LOOP
    FOR v_item IN SELECT unnest(array_cat(ARRAY(SELECT jsonb_array_elements_text(v_old_log.main_foods_all)), ARRAY(SELECT jsonb_array_elements_text(v_old_log.ingredients_used)))) LOOP
      IF v_old_log.standard_group = 'primary' THEN
        v_grams := (p_grams_primary->>v_item)::REAL;
        v_restore_kg := (v_old_log.meals_served_primary * COALESCE(v_grams, 100)) / 1000.0;
      ELSE
        v_grams := (p_grams_upper->>v_item)::REAL;
        v_restore_kg := (v_old_log.meals_served_upper_primary * COALESCE(v_grams, 150)) / 1000.0;
      END IF;
      UPDATE inventory_stock SET current_balance = current_balance + v_restore_kg WHERE teacher_id = p_teacher_id AND (item_name = v_item OR item_code = v_item) AND standard_group = v_old_log.standard_group;
    END LOOP;
  END LOOP;
  DELETE FROM consumption_logs WHERE teacher_id = p_teacher_id AND log_date = p_log_date;

  -- Apply New Consumption
  IF NOT p_is_holiday THEN
    IF p_meals_primary > 0 THEN
      INSERT INTO consumption_logs (teacher_id, log_date, meals_served_primary, meals_served_upper_primary, main_food, main_foods_all, ingredients_used, is_overridden, original_template, standard_group)
      VALUES (p_teacher_id, p_log_date, p_meals_primary, 0, p_main_foods[1], to_jsonb(p_main_foods), to_jsonb(p_ingredients), p_is_overridden, p_original_template, 'primary');
      FOR v_item IN SELECT unnest(array_cat(p_main_foods, p_ingredients)) LOOP
        v_grams := (p_grams_primary->>v_item)::REAL;
        v_deduct_kg := (p_meals_primary * COALESCE(v_grams, 100)) / 1000.0;
        UPDATE inventory_stock SET current_balance = current_balance - v_deduct_kg WHERE teacher_id = p_teacher_id AND (item_name = v_item OR item_code = v_item) AND standard_group = 'primary';
      END LOOP;
    END IF;
    IF p_meals_upper > 0 THEN
      INSERT INTO consumption_logs (teacher_id, log_date, meals_served_primary, meals_served_upper_primary, main_food, main_foods_all, ingredients_used, is_overridden, original_template, standard_group)
      VALUES (p_teacher_id, p_log_date, 0, p_meals_upper, p_main_foods[1], to_jsonb(p_main_foods), to_jsonb(p_ingredients), p_is_overridden, p_original_template, 'upper_primary');
      FOR v_item IN SELECT unnest(array_cat(p_main_foods, p_ingredients)) LOOP
        v_grams := (p_grams_upper->>v_item)::REAL;
        v_deduct_kg := (p_meals_upper * COALESCE(v_grams, 150)) / 1000.0;
        UPDATE inventory_stock SET current_balance = current_balance - v_deduct_kg WHERE teacher_id = p_teacher_id AND (item_name = v_item OR item_code = v_item) AND standard_group = 'upper_primary';
      END LOOP;
    END IF;
  END IF;

  INSERT INTO daily_logs (teacher_id, log_date, meals_served_primary, meals_served_upper_primary, is_holiday, holiday_remarks)
  VALUES (p_teacher_id, p_log_date, p_meals_primary, p_meals_upper, p_is_holiday, p_holiday_remarks)
  ON CONFLICT (teacher_id, log_date) DO UPDATE SET
    meals_served_primary = EXCLUDED.meals_served_primary, meals_served_upper_primary = EXCLUDED.meals_served_upper_primary, is_holiday = EXCLUDED.is_holiday, holiday_remarks = EXCLUDED.holiday_remarks;
END;
$$ LANGUAGE plpgsql;
