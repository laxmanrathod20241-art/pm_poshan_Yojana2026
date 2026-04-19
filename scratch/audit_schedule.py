from sqlalchemy import create_engine, text
import json
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

engine = create_engine("postgresql://postgres:admin123@127.0.0.1:5434/postgres")

email = "pratibhap154@gmail.com"

with engine.connect() as conn:
    # 1. Get Teacher ID
    res = conn.execute(text("SELECT id FROM profiles WHERE email = :email"), {"email": email}).fetchone()
    if not res:
        print(f"Error: User {email} not found.")
        sys.exit(1)
    
    tid = str(res[0]) # Ensure it's a string
    print(f"Teacher ID: {tid}")

    # 2. Get Menu Master Codes
    # Use explicit cast to handle UUID comparison
    res = conn.execute(text("SELECT item_code, item_name FROM menu_master WHERE CAST(teacher_id AS TEXT) = :tid"), {"tid": tid})
    master_codes = {r.item_code for r in res if r.item_code}
    print(f"Found {len(master_codes)} active items in Menu Master.")

    # 3. Check Weekly Schedule
    print("\n--- Weekly Schedule Analysis ---")
    res = conn.execute(text("SELECT day_name, week_pattern, main_food_codes, menu_items FROM menu_weekly_schedule WHERE CAST(teacher_id AS TEXT) = :tid AND is_active = true"), {"tid": tid})
    
    issues = []
    checked_days = 0
    for r in res:
        checked_days += 1
        day = r.day_name
        pattern = r.week_pattern
        main_foods = r.main_food_codes or []
        ingredients = r.menu_items or []
        
        # Check main foods
        for code in main_foods:
            if code not in master_codes:
                issues.append(f"Day: {day} ({pattern}) | Missing Main Food Code: {code}")
        
        # Check ingredients
        for code in ingredients:
            if code not in master_codes:
                issues.append(f"Day: {day} ({pattern}) | Missing Ingredient Code: {code}")

    if checked_days == 0:
        print("⚠️ Warning: No active weekly schedule found for this teacher.")
    elif not issues:
        print(f"✅ Status: ALL CLEAR. {checked_days} days of schedule verified.")
        print("Summary: All items in your Weekly Schedule are perfectly mapped to your Menu Master.")
    else:
        print(f"❌ Status: {len(issues)} ISSUES FOUND across {checked_days} days.")
        for issue in issues:
            print(f" - {issue}")
