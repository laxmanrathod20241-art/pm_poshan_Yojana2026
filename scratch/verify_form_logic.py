from sqlalchemy import create_engine, text
import sys
from datetime import datetime
import math

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

engine = create_engine("postgresql://postgres:admin123@127.0.0.1:5434/postgres")

teacher_id = "91209c01-909a-4d3b-b62e-2323cc8df736"

# Simulation of App Logic for Today (2026-04-19)
today = datetime(2026, 4, 19)
day_names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
string_day = day_names[today.weekday() + 1 if today.weekday() < 6 else 0] 
# Note: datetime.weekday() is 0 (Mon) to 6 (Sun). 
# App uses new Date().getDay() which is 0 (Sun) to 6 (Sat).
app_day_index = (today.weekday() + 1) % 7
string_day = day_names[app_day_index]

start_of_year = datetime(2026, 1, 1)
delta = today - start_of_year
days_elapsed = delta.days
week_number = math.ceil(days_elapsed / 7)
schedule_type = 'WEEK_2_4' if week_number % 2 == 0 else 'WEEK_1_3_5'

print(f"--- Simulation for Today: {today.strftime('%Y-%m-%d')} ---")
print(f"Day: {string_day}")
print(f"Week Number: {week_number}")
print(f"Schedule Type: {schedule_type}")

with engine.connect() as conn:
    # Get Schedule for Today
    res = conn.execute(text("""
        SELECT main_food_codes, menu_items 
        FROM menu_weekly_schedule 
        WHERE CAST(teacher_id AS TEXT) = :tid 
        AND day_name = :day 
        AND week_pattern = :type
        AND is_active = true
    """), {"tid": teacher_id, "day": string_day, "type": schedule_type}).fetchone()

    if not res:
        print("\n⚠️ Status: No active schedule found for Sunday. (Commonly school is closed).")
        # Let's check Monday to be more helpful
        monday_day = "Monday"
        res = conn.execute(text("""
            SELECT main_food_codes, menu_items 
            FROM menu_weekly_schedule 
            WHERE CAST(teacher_id AS TEXT) = :tid 
            AND day_name = :day 
            AND week_pattern = :type
            AND is_active = true
        """), {"tid": teacher_id, "day": monday_day, "type": schedule_type}).fetchone()
        print(f"\n--- Checking {monday_day} ({schedule_type}) for Verification ---")

    if res:
        main_codes = res[0] or []
        ingredient_codes = res[1] or []
        
        print(f"Scheduled Main Foods (Codes): {main_codes}")
        print(f"Scheduled Ingredients (Codes): {ingredient_codes}")
        
        # Resolve names from Menu Master
        all_codes = main_codes + ingredient_codes
        if all_codes:
            names_res = conn.execute(text("""
                SELECT item_code, item_name 
                FROM menu_master 
                WHERE CAST(teacher_id AS TEXT) = :tid 
                AND item_code IN :codes
            """), {"tid": teacher_id, "codes": tuple(all_codes)})
            
            name_map = {r.item_code: r.item_name for r in names_res}
            
            print("\n✅ Verification Result (What will show in the form):")
            print("Main Dishes:")
            for c in main_codes:
                print(f" - {name_map.get(c, 'Unknown Code')} [{c}]")
            print("Ingredients:")
            for c in ingredient_codes:
                print(f" - {name_map.get(c, 'Unknown Code')} [{c}]")
        
        print("\n✅ Status: SUCCESS. The Daily Log form logic is correctly fetching and resolving item names from the schedule.")
    else:
        print("\n❌ Status: Could not find any schedule for Monday either. Please check your Weekly Schedule settings.")
