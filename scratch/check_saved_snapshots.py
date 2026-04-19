from sqlalchemy import create_engine, text
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

engine = create_engine("postgresql://postgres:admin123@127.0.0.1:5434/postgres")

teacher_id = "91209c01-909a-4d3b-b62e-2323cc8df736"

with engine.connect() as conn:
    print("--- Item Ledger Reports Snapshots ---")
    res = conn.execute(text("""
        SELECT item_name, date_range, created_at 
        FROM item_ledger_reports 
        WHERE CAST(teacher_id AS TEXT) = :tid
    """), {"tid": teacher_id})
    for r in res:
        print(f"Item: {r.item_name}, Range: {r.date_range}, Created: {r.created_at}")
