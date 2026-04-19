from sqlalchemy import create_engine, text
import json
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

engine = create_engine("postgresql://postgres:admin123@127.0.0.1:5434/postgres")

teacher_id = "91209c01-909a-4d3b-b62e-2323cc8df736"

with engine.connect() as conn:
    print("--- Menu Master ---")
    res = conn.execute(text("SELECT item_name, item_code FROM menu_master WHERE teacher_id = :tid"), {"tid": teacher_id})
    for r in res:
        print(f"Name: '{r.item_name}', Code: '{r.item_code}'")

    print("\n--- Latest Log ---")
    res = conn.execute(text("SELECT log_date, main_foods_all, ingredients_used FROM consumption_logs WHERE teacher_id = :tid ORDER BY log_date DESC LIMIT 1"), {"tid": teacher_id})
    for r in res:
        print(f"Date: {r.log_date}")
        print(f"Main Foods: {r.main_foods_all}")
        print(f"Ingredients: {r.ingredients_used}")
