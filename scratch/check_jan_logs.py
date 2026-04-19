from sqlalchemy import create_engine, text
import json
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

engine = create_engine("postgresql://postgres:admin123@127.0.0.1:5434/postgres")

teacher_id = "91209c01-909a-4d3b-b62e-2323cc8df736"

with engine.connect() as conn:
    print("--- Detailed Logs for Jan 2026 ---")
    res = conn.execute(text("""
        SELECT log_date, meals_served_primary, meals_served_upper_primary, ingredients_used, main_foods_all 
        FROM consumption_logs 
        WHERE teacher_id = :tid 
        AND log_date >= '2026-01-01' AND log_date <= '2026-01-31'
    """), {"tid": teacher_id})
    logs = res.fetchall()
    for l in logs:
        print(f"Date: {l.log_date}, P: {l.meals_served_primary}, U: {l.meals_served_upper_primary}")
        print(f"Main Foods: {json.dumps(l.main_foods_all, ensure_ascii=False)}")
        print(f"Ingredients: {json.dumps(l.ingredients_used, ensure_ascii=False)}")
        print("-" * 20)
