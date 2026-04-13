-- PM-POSHAN TRACKER: CREDIT LEDGER SOURCE-OF-TRUTH UPGRADE (v6.0)
-- Objective: Add 'borrowed_items' column to consumption_logs and update RPC to save deficits.

-- 1. ADD 'borrowed_items' COLUMN
ALTER TABLE consumption_logs ADD COLUMN IF NOT EXISTS borrowed_items JSONB DEFAULT '{}'::jsonb;

-- 2. UPDATED ATOMIC RPC FUNCTION (Calculation of deficit/credit)
CREATE OR REPLACE FUNCTION process_daily_consumption(
  p_teacher_id UUID, p_log_date DATE, p_is_holiday BOOLEAN, p_holiday_remarks TEXT,
  p_meals_primary INTEGER, p_meals_upper INTEGER, p_main_foods TEXT[], p_ingredients TEXT[],
  p_is_overridden BOOLEAN, p_original_template JSONB, p_grams_primary JSONB, p_grams_upper JSONB
)
RETURNS VOID AS $$
DECLARE
  v_old_log RECORD; 
  v_item TEXT; 
  v_grams REAL; 
  v_restore_kg REAL; 
  v_deduct_kg REAL;
  v_current_stock REAL;
  v_borrowed_items_primary JSONB := '{}'::jsonb;
  v_borrowed_items_upper JSONB := '{}'::jsonb;
BEGIN
  -- 1. RESTORE INVENTORY (Standard v5 logic)
  FOR v_old_log IN SELECT * FROM consumption_logs WHERE teacher_id = p_teacher_id AND log_date = p_log_date LOOP
    FOR v_item IN SELECT unnest(array_cat(
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_old_log.main_foods_all, '[]'::jsonb))), 
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_old_log.ingredients_used, '[]'::jsonb)))
    )) LOOP
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

  -- 2. APPLY NEW CONSUMPTION & CALCULATE DEFICITS
  IF NOT p_is_holiday THEN
    -- A. PRIMARY SECTION
    IF p_meals_primary > 0 THEN
      FOR v_item IN SELECT unnest(array_cat(p_main_foods, p_ingredients)) LOOP
        v_grams := (p_grams_primary->>v_item)::REAL;
        v_deduct_kg := (p_meals_primary * COALESCE(v_grams, 100)) / 1000.0;
        
        -- Get current stock before deduction to find deficit
        SELECT current_balance INTO v_current_stock FROM inventory_stock 
        WHERE teacher_id = p_teacher_id AND (item_name = v_item OR item_code = v_item) AND standard_group = 'primary';
        
        IF v_deduct_kg > COALESCE(v_current_stock, 0) THEN
          v_borrowed_items_primary := v_borrowed_items_primary || jsonb_build_object(v_item, v_deduct_kg - COALESCE(v_current_stock, 0));
        END IF;

        UPDATE inventory_stock SET current_balance = current_balance - v_deduct_kg 
        WHERE teacher_id = p_teacher_id AND (item_name = v_item OR item_code = v_item) AND standard_group = 'primary';
      END LOOP;

      INSERT INTO consumption_logs (teacher_id, log_date, meals_served_primary, meals_served_upper_primary, main_food, main_foods_all, ingredients_used, is_overridden, original_template, standard_group, borrowed_items)
      VALUES (p_teacher_id, p_log_date, p_meals_primary, 0, p_main_foods[1], to_jsonb(p_main_foods), to_jsonb(p_ingredients), p_is_overridden, p_original_template, 'primary', v_borrowed_items_primary);
    END IF;

    -- B. UPPER PRIMARY SECTION
    IF p_meals_upper > 0 THEN
      FOR v_item IN SELECT unnest(array_cat(p_main_foods, p_ingredients)) LOOP
        v_grams := (p_grams_upper->>v_item)::REAL;
        v_deduct_kg := (p_meals_upper * COALESCE(v_grams, 150)) / 1000.0;
        
        -- Get current stock before deduction to find deficit
        SELECT current_balance INTO v_current_stock FROM inventory_stock 
        WHERE teacher_id = p_teacher_id AND (item_name = v_item OR item_code = v_item) AND standard_group = 'upper_primary';
        
        IF v_deduct_kg > COALESCE(v_current_stock, 0) THEN
          v_borrowed_items_upper := v_borrowed_items_upper || jsonb_build_object(v_item, v_deduct_kg - COALESCE(v_current_stock, 0));
        END IF;

        UPDATE inventory_stock SET current_balance = current_balance - v_deduct_kg 
        WHERE teacher_id = p_teacher_id AND (item_name = v_item OR item_code = v_item) AND standard_group = 'upper_primary';
      END LOOP;

      INSERT INTO consumption_logs (teacher_id, log_date, meals_served_primary, meals_served_upper_primary, main_food, main_foods_all, ingredients_used, is_overridden, original_template, standard_group, borrowed_items)
      VALUES (p_teacher_id, p_log_date, 0, p_meals_upper, p_main_foods[1], to_jsonb(p_main_foods), to_jsonb(p_ingredients), p_is_overridden, p_original_template, 'upper_primary', v_borrowed_items_upper);
    END IF;
  END IF;

  -- 3. ATTENDANCE UPSERT
  INSERT INTO daily_logs (teacher_id, log_date, meals_served_primary, meals_served_upper_primary, is_holiday, holiday_remarks)
  VALUES (p_teacher_id, p_log_date, p_meals_primary, p_meals_upper, p_is_holiday, p_holiday_remarks)
  ON CONFLICT (teacher_id, log_date) DO UPDATE SET
    meals_served_primary = EXCLUDED.meals_served_primary, meals_served_upper_primary = EXCLUDED.meals_served_upper_primary, is_holiday = EXCLUDED.is_holiday, holiday_remarks = EXCLUDED.holiday_remarks;
END;
$$ LANGUAGE plpgsql;
