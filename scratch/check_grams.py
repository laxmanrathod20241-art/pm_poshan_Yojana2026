from sqlalchemy import create_engine, text
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

engine = create_engine("postgresql://postgres:admin123@127.0.0.1:5434/postgres")

teacher_id = "91209c01-909a-4d3b-b62e-2323cc8df736"

with engine.connect() as conn:
    print("--- Menu Master Grams ---")
    res = conn.execute(text("SELECT item_name, grams_primary, grams_upper_primary FROM menu_master WHERE teacher_id = :tid"), {"tid": teacher_id})
    for r in res:
        print(f"Item: {r.item_name}, Primary: {r.grams_primary}, Upper: {r.grams_upper_primary}")
