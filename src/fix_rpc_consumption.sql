-- ATOMIC TRANSACTION FOR DAILY CONSUMPTION
-- Project: PM-POSHAN Tracker
-- Version: 2.0 (Scoped Multi-Tenant)
-- Objective: Ensure inventory restoration and deduction are atomic.

CREATE OR REPLACE FUNCTION process_daily_consumption(
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
  p_grams_primary JSONB, -- Map of { item_name: grams }
  p_grams_upper JSONB    -- Map of { item_name: grams }
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
  -- We find any existing consumption logs for this date and teacher and restore their quantities
  FOR v_old_log IN 
    SELECT * FROM consumption_logs 
    WHERE teacher_id = p_teacher_id AND log_date = p_log_date
  LOOP
    FOR v_item IN SELECT unnest(array_cat(v_old_log.main_foods_all, v_old_log.ingredients_used))
    LOOP
      -- Determine recovery grams (using the provided logic or fallback)
      IF v_old_log.standard_group = 'primary' THEN
        v_grams := (p_grams_primary->>v_item)::REAL;
        v_restore_kg := (v_old_log.meals_served_primary * COALESCE(v_grams, 100)) / 1000.0;
      ELSE
        v_grams := (p_grams_upper->>v_item)::REAL;
        v_restore_kg := (v_old_log.meals_served_upper_primary * COALESCE(v_grams, 150)) / 1000.0;
      END IF;

      IF v_restore_kg > 0 THEN
        UPDATE inventory_stock 
        SET current_balance = current_balance + v_restore_kg
        WHERE teacher_id = p_teacher_id 
          AND (item_name = v_item OR item_code = v_item)
          AND standard_group = v_old_log.standard_group;
      END IF;
    END LOOP;
  END LOOP;

  -- 2. CLEAR OLD STATE
  DELETE FROM consumption_logs WHERE teacher_id = p_teacher_id AND log_date = p_log_date;

  -- 3. APPLY NEW CONSUMPTION (IF NOT HOLIDAY)
  IF NOT p_is_holiday THEN
    -- A. Process Primary (I-V)
    IF p_meals_primary > 0 THEN
      INSERT INTO consumption_logs (
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
          UPDATE inventory_stock 
          SET current_balance = current_balance - v_deduct_kg
          WHERE teacher_id = p_teacher_id 
            AND (item_name = v_item OR item_code = v_item)
            AND standard_group = 'primary';
        END IF;
      END LOOP;
    END IF;

    -- B. Process Upper Primary (VI-VIII)
    IF p_meals_upper > 0 THEN
      INSERT INTO consumption_logs (
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
          UPDATE inventory_stock 
          SET current_balance = current_balance - v_deduct_kg
          WHERE teacher_id = p_teacher_id 
            AND (item_name = v_item OR item_code = v_item)
            AND standard_group = 'upper_primary';
        END IF;
      END LOOP;
    END IF;
  END IF;

  -- 4. UPSERT ATTENDANCE LOG
  INSERT INTO daily_logs (
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
$$ LANGUAGE plpgsql;
