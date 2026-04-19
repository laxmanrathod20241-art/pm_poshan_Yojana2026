from sqlalchemy import create_engine, text
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

engine = create_engine("postgresql://postgres:admin123@127.0.0.1:5434/postgres")

teacher_id = "91209c01-909a-4d3b-b62e-2323cc8df736"

with engine.connect() as conn:
    print("--- Current Kanda Masala Balance ---")
    res = conn.execute(text("""
        SELECT current_balance 
        FROM inventory_stock 
        WHERE CAST(teacher_id AS TEXT) = :tid 
        AND item_name = 'कांदामसाला'
    """), {"tid": teacher_id})
    row = res.fetchone()
    if row:
        print(f"Balance: {row.current_balance}")
    else:
        print("Kanda Masala not found in inventory_stock.")
