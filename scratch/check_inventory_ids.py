from sqlalchemy import create_engine, text
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

engine = create_engine("postgresql://postgres:admin123@127.0.0.1:5434/postgres")

teacher_id = "91209c01-909a-4d3b-b62e-2323cc8df736"

with engine.connect() as conn:
    print("--- Inventory Stock IDs ---")
    res = conn.execute(text("""
        SELECT id, item_name, item_code, current_balance 
        FROM inventory_stock 
        WHERE CAST(teacher_id AS TEXT) = :tid
    """), {"tid": teacher_id})
    for r in res:
        print(f"ID={r.id}, Name={r.item_name}, Code={r.item_code}, Balance={r.current_balance}")
