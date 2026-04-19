


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "row_security" TO 'off'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'teacher');
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_daily_consumption"("p_teacher_id" "uuid", "p_log_date" "date", "p_is_holiday" boolean, "p_holiday_remarks" "text", "p_meals_primary" integer, "p_meals_upper" integer, "p_main_foods" "text"[], "p_ingredients" "text"[], "p_is_overridden" boolean, "p_original_template" "jsonb", "p_grams_primary" "jsonb", "p_grams_upper" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
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
$$;


ALTER FUNCTION "public"."process_daily_consumption"("p_teacher_id" "uuid", "p_log_date" "date", "p_is_holiday" boolean, "p_holiday_remarks" "text", "p_meals_primary" integer, "p_meals_upper" integer, "p_main_foods" "text"[], "p_ingredients" "text"[], "p_is_overridden" boolean, "p_original_template" "jsonb", "p_grams_primary" "jsonb", "p_grams_upper" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."consumption_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "teacher_id" "uuid",
    "log_date" "date" NOT NULL,
    "meals_served_primary" integer DEFAULT 0,
    "meals_served_upper_primary" integer DEFAULT 0,
    "main_food" "text",
    "main_foods_all" "jsonb" DEFAULT '[]'::"jsonb",
    "ingredients_used" "jsonb" DEFAULT '[]'::"jsonb",
    "is_overridden" boolean DEFAULT false,
    "original_template" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_holiday" boolean DEFAULT false,
    "holiday_remarks" "text",
    "standard_group" "text" DEFAULT 'primary'::"text",
    "borrowed_items" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."consumption_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cooking_staff" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "staff_name" "text" NOT NULL,
    "post_name" "text" NOT NULL,
    "monthly_cost" numeric DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "record_month" integer DEFAULT EXTRACT(month FROM CURRENT_DATE) NOT NULL,
    "record_year" integer DEFAULT EXTRACT(year FROM CURRENT_DATE) NOT NULL,
    "standard_group" "text" DEFAULT 'primary'::"text",
    "payment_type" "text" DEFAULT 'per_day'::"text",
    "rate_primary" numeric DEFAULT 0,
    "rate_upper" numeric DEFAULT 0,
    CONSTRAINT "cooking_staff_payment_type_check" CHECK (("payment_type" = ANY (ARRAY['per_student'::"text", 'per_day'::"text"])))
);


ALTER TABLE "public"."cooking_staff" OWNER TO "postgres";


COMMENT ON COLUMN "public"."cooking_staff"."payment_type" IS 'Calculation basis: per_student (attendance * rate) or per_day (fixed rate per working day)';



COMMENT ON COLUMN "public"."cooking_staff"."rate_primary" IS ' Honorarium rate for Primary (Stds 1-5)';



COMMENT ON COLUMN "public"."cooking_staff"."rate_upper" IS 'Honorarium rate for Upper Primary (Stds 6-8)';



CREATE TABLE IF NOT EXISTS "public"."daily_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "log_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "meals_served_primary" integer DEFAULT 0,
    "meals_served_upper_primary" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_holiday" boolean DEFAULT false,
    "holiday_remarks" "text"
);


ALTER TABLE "public"."daily_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."demand_reports" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "report_period" "text" NOT NULL,
    "class_group" "text" NOT NULL,
    "working_days" integer NOT NULL,
    "enrollment_count" integer NOT NULL,
    "report_data" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "standard_group" "text" DEFAULT 'primary'::"text"
);


ALTER TABLE "public"."demand_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."financial_ledger_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "fiscal_year" integer NOT NULL,
    "ledger_data" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "section_type" "text" DEFAULT 'primary'::"text",
    CONSTRAINT "check_valid_section_snapshot" CHECK (("section_type" = ANY (ARRAY['primary'::"text", 'upper_primary'::"text"])))
);


ALTER TABLE "public"."financial_ledger_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fuel_tracking" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "fuel_type" "text" NOT NULL,
    "monthly_cost" numeric DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "record_month" integer DEFAULT EXTRACT(month FROM CURRENT_DATE) NOT NULL,
    "record_year" integer DEFAULT EXTRACT(year FROM CURRENT_DATE) NOT NULL,
    "standard_group" "text" DEFAULT 'primary'::"text",
    "fuel_rate_primary" numeric DEFAULT 0,
    "fuel_rate_upper" numeric DEFAULT 0,
    "veg_rate_primary" numeric DEFAULT 0,
    "veg_rate_upper" numeric DEFAULT 0
);


ALTER TABLE "public"."fuel_tracking" OWNER TO "postgres";


COMMENT ON COLUMN "public"."fuel_tracking"."monthly_cost" IS 'Deprecated: Use fuel_rate and veg_rate instead.';



CREATE TABLE IF NOT EXISTS "public"."global_food_master" (
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "name_en" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "item_category" "text" DEFAULT 'MAIN'::"text",
    CONSTRAINT "global_food_master_item_category_check" CHECK (("item_category" = ANY (ARRAY['MAIN'::"text", 'INGREDIENT'::"text"])))
);


ALTER TABLE "public"."global_food_master" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_stock" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "item_name" "text" NOT NULL,
    "current_balance" numeric DEFAULT 0 NOT NULL,
    "unit" "text" DEFAULT 'kg'::"text",
    "last_updated" timestamp with time zone DEFAULT "now"(),
    "standard_group" "text" DEFAULT 'primary'::"text",
    "item_code" "text"
);


ALTER TABLE "public"."inventory_stock" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."item_ledger_reports" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "item_name" "text" NOT NULL,
    "date_range" "text" NOT NULL,
    "report_data" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "standard_group" "text" DEFAULT 'primary'::"text"
);


ALTER TABLE "public"."item_ledger_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."local_food_master" (
    "local_code" "text" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "default_unit" "text" DEFAULT 'kg'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "name_en" "text",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_category" "text" DEFAULT 'MAIN'::"text",
    CONSTRAINT "local_food_master_item_category_check" CHECK (("item_category" = ANY (ARRAY['MAIN'::"text", 'INGREDIENT'::"text"])))
);


ALTER TABLE "public"."local_food_master" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."menu_master" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "item_name" "text" NOT NULL,
    "grams_primary" numeric DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "item_code" "text",
    "source" "text" DEFAULT 'global'::"text",
    "item_category" "text" DEFAULT 'MAIN'::"text",
    "grams_upper_primary" numeric DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."menu_master" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."menu_weekly_schedule" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "week_pattern" "text" NOT NULL,
    "day_name" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "menu_items" "jsonb" DEFAULT '[]'::"jsonb",
    "main_food_codes" "jsonb" DEFAULT '[]'::"jsonb",
    CONSTRAINT "menu_weekly_schedule_day_name_check" CHECK (("day_name" = ANY (ARRAY['Monday'::"text", 'Tuesday'::"text", 'Wednesday'::"text", 'Thursday'::"text", 'Friday'::"text", 'Saturday'::"text", 'Sunday'::"text"]))),
    CONSTRAINT "menu_weekly_schedule_week_pattern_check" CHECK (("week_pattern" = ANY (ARRAY['WEEK_1_3_5'::"text", 'WEEK_2_4'::"text"])))
);


ALTER TABLE "public"."menu_weekly_schedule" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."monthly_reports" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "report_month" integer NOT NULL,
    "report_year" integer NOT NULL,
    "report_data" "jsonb" NOT NULL,
    "is_locked" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "daily_ledger_data" "jsonb",
    "standard_group" "text" DEFAULT 'primary'::"text"
);


ALTER TABLE "public"."monthly_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_receipts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "receipt_date" "date" NOT NULL,
    "amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "remarks" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "section_type" "text" DEFAULT 'primary'::"text",
    CONSTRAINT "check_valid_section_type" CHECK (("section_type" = ANY (ARRAY['primary'::"text", 'upper_primary'::"text"])))
);


ALTER TABLE "public"."payment_receipts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" DEFAULT 'teacher'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "first_name" "text",
    "last_name" "text",
    "school_name" "text",
    "school_id" "text",
    "school_name_mr" "text",
    "center_name_mr" "text",
    "taluka_mr" "text",
    "district_mr" "text",
    "has_primary" boolean DEFAULT true,
    "has_upper_primary" boolean DEFAULT true,
    "is_onboarded" boolean DEFAULT false,
    "onboarding_step" integer DEFAULT 1,
    "saas_plan_type" "text" DEFAULT 'primary'::"text",
    "saas_payment_status" "text" DEFAULT 'unpaid'::"text",
    "saas_amount_paid" numeric DEFAULT 0,
    "saas_expiry_date" timestamp with time zone,
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['master'::"text", 'teacher'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."is_onboarded" IS 'Whether the school has completed the mandatory 6-step setup wizard.';



COMMENT ON COLUMN "public"."profiles"."onboarding_step" IS 'The current step (1-6) the user is on in the onboarding wizard.';



CREATE TABLE IF NOT EXISTS "public"."saas_coupons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "discount_percent" numeric DEFAULT 5 NOT NULL,
    "promoter_name" "text",
    "usage_limit" integer,
    "usage_count" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."saas_coupons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."saas_pricing" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "section_type" "text" NOT NULL,
    "base_price" numeric DEFAULT 800 NOT NULL,
    "description" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."saas_pricing" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."saas_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "teacher_id" "uuid",
    "plan_type" "text" NOT NULL,
    "amount_paid" numeric NOT NULL,
    "coupon_used" "text",
    "razorpay_order_id" "text",
    "razorpay_payment_id" "text",
    "payment_status" "text" DEFAULT 'unpaid'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."saas_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schools" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."schools" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_receipts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "item_name" "text" NOT NULL,
    "quantity_kg" numeric NOT NULL,
    "unit" "text" DEFAULT 'kg'::"text",
    "receipt_date" "date" DEFAULT CURRENT_DATE,
    "remarks" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "standard_group" "text" DEFAULT 'primary'::"text"
);


ALTER TABLE "public"."stock_receipts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_enrollment" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "std_1" numeric DEFAULT 0,
    "std_2" numeric DEFAULT 0,
    "std_3" numeric DEFAULT 0,
    "std_4" numeric DEFAULT 0,
    "std_5" numeric DEFAULT 0,
    "std_6" numeric DEFAULT 0,
    "std_7" numeric DEFAULT 0,
    "std_8" numeric DEFAULT 0,
    "last_updated" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."student_enrollment" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_modules" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "module_name" "text" NOT NULL,
    "route_path" "text" NOT NULL,
    "icon_name" "text" NOT NULL,
    "is_active_for_teachers" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."system_modules" OWNER TO "postgres";


ALTER TABLE ONLY "public"."consumption_logs"
    ADD CONSTRAINT "consumption_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consumption_logs"
    ADD CONSTRAINT "consumption_logs_teacher_date_group_unique" UNIQUE ("teacher_id", "log_date", "standard_group");



ALTER TABLE ONLY "public"."cooking_staff"
    ADD CONSTRAINT "cooking_staff_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_logs"
    ADD CONSTRAINT "daily_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_logs"
    ADD CONSTRAINT "daily_logs_teacher_id_log_date_key" UNIQUE ("teacher_id", "log_date");



ALTER TABLE ONLY "public"."demand_reports"
    ADD CONSTRAINT "demand_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."financial_ledger_snapshots"
    ADD CONSTRAINT "financial_ledger_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."financial_ledger_snapshots"
    ADD CONSTRAINT "financial_ledger_snapshots_teacher_year_section_key" UNIQUE ("teacher_id", "fiscal_year", "section_type");



ALTER TABLE ONLY "public"."fuel_tracking"
    ADD CONSTRAINT "fuel_tracking_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."global_food_master"
    ADD CONSTRAINT "global_food_master_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."inventory_stock"
    ADD CONSTRAINT "inventory_stock_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_stock"
    ADD CONSTRAINT "inventory_stock_teacher_item_group_unique" UNIQUE ("teacher_id", "item_name", "standard_group");



ALTER TABLE ONLY "public"."item_ledger_reports"
    ADD CONSTRAINT "item_ledger_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."item_ledger_reports"
    ADD CONSTRAINT "item_ledger_reports_unique_record" UNIQUE ("teacher_id", "item_name", "date_range");



ALTER TABLE ONLY "public"."local_food_master"
    ADD CONSTRAINT "local_food_master_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."menu_master"
    ADD CONSTRAINT "menu_master_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."menu_weekly_schedule"
    ADD CONSTRAINT "menu_weekly_schedule_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."menu_weekly_schedule"
    ADD CONSTRAINT "menu_weekly_schedule_teacher_id_week_pattern_day_name_key" UNIQUE ("teacher_id", "week_pattern", "day_name");



ALTER TABLE ONLY "public"."monthly_reports"
    ADD CONSTRAINT "monthly_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."monthly_reports"
    ADD CONSTRAINT "monthly_reports_teacher_id_report_month_report_year_key" UNIQUE ("teacher_id", "report_month", "report_year");



ALTER TABLE ONLY "public"."monthly_reports"
    ADD CONSTRAINT "monthly_reports_teacher_month_year_group_unique" UNIQUE ("teacher_id", "report_month", "report_year", "standard_group");



ALTER TABLE ONLY "public"."payment_receipts"
    ADD CONSTRAINT "payment_receipts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saas_coupons"
    ADD CONSTRAINT "saas_coupons_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."saas_coupons"
    ADD CONSTRAINT "saas_coupons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saas_pricing"
    ADD CONSTRAINT "saas_pricing_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saas_pricing"
    ADD CONSTRAINT "saas_pricing_section_type_key" UNIQUE ("section_type");



ALTER TABLE ONLY "public"."saas_subscriptions"
    ADD CONSTRAINT "saas_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_receipts"
    ADD CONSTRAINT "stock_receipts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_enrollment"
    ADD CONSTRAINT "student_enrollment_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_enrollment"
    ADD CONSTRAINT "student_enrollment_teacher_id_key" UNIQUE ("teacher_id");



ALTER TABLE ONLY "public"."system_modules"
    ADD CONSTRAINT "system_modules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."local_food_master"
    ADD CONSTRAINT "unique_local_food" UNIQUE ("teacher_id", "name");



ALTER TABLE ONLY "public"."inventory_stock"
    ADD CONSTRAINT "unique_teacher_food" UNIQUE ("teacher_id", "item_name");



CREATE INDEX "idx_payment_receipts_date" ON "public"."payment_receipts" USING "btree" ("receipt_date");



CREATE INDEX "idx_payment_receipts_teacher_id" ON "public"."payment_receipts" USING "btree" ("teacher_id");



CREATE INDEX "idx_receipts_teacher" ON "public"."payment_receipts" USING "btree" ("teacher_id");



CREATE INDEX "idx_snapshots_lookup" ON "public"."financial_ledger_snapshots" USING "btree" ("teacher_id", "fiscal_year", "section_type");



ALTER TABLE ONLY "public"."consumption_logs"
    ADD CONSTRAINT "consumption_logs_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cooking_staff"
    ADD CONSTRAINT "cooking_staff_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."daily_logs"
    ADD CONSTRAINT "daily_logs_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."demand_reports"
    ADD CONSTRAINT "demand_reports_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."financial_ledger_snapshots"
    ADD CONSTRAINT "financial_ledger_snapshots_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fuel_tracking"
    ADD CONSTRAINT "fuel_tracking_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."inventory_stock"
    ADD CONSTRAINT "inventory_stock_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."item_ledger_reports"
    ADD CONSTRAINT "item_ledger_reports_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."local_food_master"
    ADD CONSTRAINT "local_food_master_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."menu_master"
    ADD CONSTRAINT "menu_master_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."menu_weekly_schedule"
    ADD CONSTRAINT "menu_weekly_schedule_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."monthly_reports"
    ADD CONSTRAINT "monthly_reports_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."payment_receipts"
    ADD CONSTRAINT "payment_receipts_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saas_subscriptions"
    ADD CONSTRAINT "saas_subscriptions_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_receipts"
    ADD CONSTRAINT "stock_receipts_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."student_enrollment"
    ADD CONSTRAINT "student_enrollment_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "auth"."users"("id");



CREATE POLICY "Admin full access profiles" ON "public"."profiles" TO "authenticated" USING ((("auth"."jwt"() ->> 'role'::"text") = 'master'::"text"));



CREATE POLICY "All authenticated can read global foods" ON "public"."global_food_master" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable delete for users based on user_id" ON "public"."daily_logs" FOR DELETE USING (("teacher_id" = "auth"."uid"()));



CREATE POLICY "Master admin bypass saas_coupons" ON "public"."saas_coupons" TO "authenticated" USING ((("auth"."jwt"() ->> 'role'::"text") = 'master'::"text"));



CREATE POLICY "Master admin bypass saas_pricing" ON "public"."saas_pricing" TO "authenticated" USING ((("auth"."jwt"() ->> 'role'::"text") = 'master'::"text"));



CREATE POLICY "Master admin bypass saas_subscriptions" ON "public"."saas_subscriptions" TO "authenticated" USING ((("auth"."jwt"() ->> 'role'::"text") = 'master'::"text"));



CREATE POLICY "Master admins can view all logs" ON "public"."daily_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'master'::"text")))));



CREATE POLICY "Masters can delete global foods" ON "public"."global_food_master" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'master'::"text")))));



CREATE POLICY "Masters can insert global foods" ON "public"."global_food_master" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'master'::"text")))));



CREATE POLICY "Own inventory only" ON "public"."inventory_stock" TO "authenticated" USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Own local foods only" ON "public"."local_food_master" TO "authenticated" USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Own menu only" ON "public"."menu_master" TO "authenticated" USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Own receipts only" ON "public"."stock_receipts" TO "authenticated" USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Policy_consumption_logs_owner" ON "public"."consumption_logs" TO "authenticated" USING (("auth"."uid"() = "teacher_id")) WITH CHECK (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Policy_daily_logs_owner" ON "public"."daily_logs" TO "authenticated" USING (("auth"."uid"() = "teacher_id")) WITH CHECK (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Policy_financial_ledger_snapshots_owner" ON "public"."financial_ledger_snapshots" TO "authenticated" USING (("auth"."uid"() = "teacher_id")) WITH CHECK (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Policy_inventory_stock_owner" ON "public"."inventory_stock" TO "authenticated" USING (("auth"."uid"() = "teacher_id")) WITH CHECK (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Policy_menu_master_owner" ON "public"."menu_master" TO "authenticated" USING (("auth"."uid"() = "teacher_id")) WITH CHECK (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Policy_menu_weekly_schedule_owner" ON "public"."menu_weekly_schedule" TO "authenticated" USING (("auth"."uid"() = "teacher_id")) WITH CHECK (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Policy_monthly_reports_owner" ON "public"."monthly_reports" TO "authenticated" USING (("auth"."uid"() = "teacher_id")) WITH CHECK (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Policy_payment_receipts_owner" ON "public"."payment_receipts" TO "authenticated" USING (("auth"."uid"() = "teacher_id")) WITH CHECK (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Policy_stock_receipts_owner" ON "public"."stock_receipts" TO "authenticated" USING (("auth"."uid"() = "teacher_id")) WITH CHECK (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Policy_student_enrollment_owner" ON "public"."student_enrollment" TO "authenticated" USING (("auth"."uid"() = "teacher_id")) WITH CHECK (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Public read saas_pricing" ON "public"."saas_pricing" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Schools readable by authenticated users" ON "public"."schools" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "System modules: authenticated read" ON "public"."system_modules" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "System modules: public read" ON "public"."system_modules" FOR SELECT USING (true);



CREATE POLICY "Teachers can delete their own receipts" ON "public"."payment_receipts" FOR DELETE USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Teachers can insert own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Teachers can insert their own logs" ON "public"."daily_logs" FOR INSERT WITH CHECK (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Teachers can insert their own receipts" ON "public"."payment_receipts" FOR INSERT WITH CHECK (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Teachers can manage their own consumption logs" ON "public"."consumption_logs" TO "authenticated" USING (("auth"."uid"() = "teacher_id")) WITH CHECK (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Teachers can manage their own menu" ON "public"."menu_master" USING (("auth"."uid"() = "teacher_id")) WITH CHECK (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Teachers can manage their own receipts" ON "public"."payment_receipts" USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Teachers can manage their own snapshots" ON "public"."financial_ledger_snapshots" USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Teachers can update own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Teachers can update their own receipts" ON "public"."payment_receipts" FOR UPDATE USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Teachers can view pricing" ON "public"."saas_pricing" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Teachers can view their own logs" ON "public"."daily_logs" FOR SELECT USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Teachers can view their own receipts" ON "public"."payment_receipts" FOR SELECT USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Teachers manage own demand reports" ON "public"."demand_reports" USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Teachers manage own enrollment" ON "public"."student_enrollment" USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Teachers manage own fuel" ON "public"."fuel_tracking" USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Teachers manage own reports" ON "public"."monthly_reports" USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Teachers manage own schedule" ON "public"."menu_weekly_schedule" USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Teachers manage own staff" ON "public"."cooking_staff" USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Teachers manage their own local foods" ON "public"."local_food_master" USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Teachers manage their own stock" ON "public"."inventory_stock" USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Teachers see only their receipts" ON "public"."stock_receipts" USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Users can manage own inventory" ON "public"."inventory_stock" USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Users can manage own menu" ON "public"."menu_master" USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Users can manage own receipts" ON "public"."stock_receipts" USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Users can manage their own demand reports" ON "public"."demand_reports" USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Users can manage their own item ledgers" ON "public"."item_ledger_reports" USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Users view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."consumption_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cooking_staff" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."demand_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."financial_ledger_snapshots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fuel_tracking" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."global_food_master" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_stock" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."item_ledger_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."local_food_master" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."menu_weekly_schedule" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."monthly_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_receipts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."saas_coupons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."saas_pricing" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."saas_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_receipts" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_daily_consumption"("p_teacher_id" "uuid", "p_log_date" "date", "p_is_holiday" boolean, "p_holiday_remarks" "text", "p_meals_primary" integer, "p_meals_upper" integer, "p_main_foods" "text"[], "p_ingredients" "text"[], "p_is_overridden" boolean, "p_original_template" "jsonb", "p_grams_primary" "jsonb", "p_grams_upper" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."process_daily_consumption"("p_teacher_id" "uuid", "p_log_date" "date", "p_is_holiday" boolean, "p_holiday_remarks" "text", "p_meals_primary" integer, "p_meals_upper" integer, "p_main_foods" "text"[], "p_ingredients" "text"[], "p_is_overridden" boolean, "p_original_template" "jsonb", "p_grams_primary" "jsonb", "p_grams_upper" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_daily_consumption"("p_teacher_id" "uuid", "p_log_date" "date", "p_is_holiday" boolean, "p_holiday_remarks" "text", "p_meals_primary" integer, "p_meals_upper" integer, "p_main_foods" "text"[], "p_ingredients" "text"[], "p_is_overridden" boolean, "p_original_template" "jsonb", "p_grams_primary" "jsonb", "p_grams_upper" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON TABLE "public"."consumption_logs" TO "anon";
GRANT ALL ON TABLE "public"."consumption_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."consumption_logs" TO "service_role";



GRANT ALL ON TABLE "public"."cooking_staff" TO "anon";
GRANT ALL ON TABLE "public"."cooking_staff" TO "authenticated";
GRANT ALL ON TABLE "public"."cooking_staff" TO "service_role";



GRANT ALL ON TABLE "public"."daily_logs" TO "anon";
GRANT ALL ON TABLE "public"."daily_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_logs" TO "service_role";



GRANT ALL ON TABLE "public"."demand_reports" TO "anon";
GRANT ALL ON TABLE "public"."demand_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."demand_reports" TO "service_role";



GRANT ALL ON TABLE "public"."financial_ledger_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."financial_ledger_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."financial_ledger_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."fuel_tracking" TO "anon";
GRANT ALL ON TABLE "public"."fuel_tracking" TO "authenticated";
GRANT ALL ON TABLE "public"."fuel_tracking" TO "service_role";



GRANT ALL ON TABLE "public"."global_food_master" TO "anon";
GRANT ALL ON TABLE "public"."global_food_master" TO "authenticated";
GRANT ALL ON TABLE "public"."global_food_master" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_stock" TO "anon";
GRANT ALL ON TABLE "public"."inventory_stock" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_stock" TO "service_role";



GRANT ALL ON TABLE "public"."item_ledger_reports" TO "anon";
GRANT ALL ON TABLE "public"."item_ledger_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."item_ledger_reports" TO "service_role";



GRANT ALL ON TABLE "public"."local_food_master" TO "anon";
GRANT ALL ON TABLE "public"."local_food_master" TO "authenticated";
GRANT ALL ON TABLE "public"."local_food_master" TO "service_role";



GRANT ALL ON TABLE "public"."menu_master" TO "anon";
GRANT ALL ON TABLE "public"."menu_master" TO "authenticated";
GRANT ALL ON TABLE "public"."menu_master" TO "service_role";



GRANT ALL ON TABLE "public"."menu_weekly_schedule" TO "anon";
GRANT ALL ON TABLE "public"."menu_weekly_schedule" TO "authenticated";
GRANT ALL ON TABLE "public"."menu_weekly_schedule" TO "service_role";



GRANT ALL ON TABLE "public"."monthly_reports" TO "anon";
GRANT ALL ON TABLE "public"."monthly_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."monthly_reports" TO "service_role";



GRANT ALL ON TABLE "public"."payment_receipts" TO "anon";
GRANT ALL ON TABLE "public"."payment_receipts" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_receipts" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."saas_coupons" TO "anon";
GRANT ALL ON TABLE "public"."saas_coupons" TO "authenticated";
GRANT ALL ON TABLE "public"."saas_coupons" TO "service_role";



GRANT ALL ON TABLE "public"."saas_pricing" TO "anon";
GRANT ALL ON TABLE "public"."saas_pricing" TO "authenticated";
GRANT ALL ON TABLE "public"."saas_pricing" TO "service_role";



GRANT ALL ON TABLE "public"."saas_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."saas_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."saas_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."schools" TO "anon";
GRANT ALL ON TABLE "public"."schools" TO "authenticated";
GRANT ALL ON TABLE "public"."schools" TO "service_role";



GRANT ALL ON TABLE "public"."stock_receipts" TO "anon";
GRANT ALL ON TABLE "public"."stock_receipts" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_receipts" TO "service_role";



GRANT ALL ON TABLE "public"."student_enrollment" TO "anon";
GRANT ALL ON TABLE "public"."student_enrollment" TO "authenticated";
GRANT ALL ON TABLE "public"."student_enrollment" TO "service_role";



GRANT ALL ON TABLE "public"."system_modules" TO "anon";
GRANT ALL ON TABLE "public"."system_modules" TO "authenticated";
GRANT ALL ON TABLE "public"."system_modules" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







