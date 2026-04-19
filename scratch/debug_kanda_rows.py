from sqlalchemy import create_engine, text
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

engine = create_engine("postgresql://postgres:admin123@127.0.0.1:5434/postgres")

with engine.connect() as conn:
    print("--- All Kanda Masala Records ---")
    res = conn.execute(text("""
        SELECT id, teacher_id, current_balance 
        FROM inventory_stock 
        WHERE item_name = 'कांदामसाला'
    """))
    for r in res:
        print(f"ID={r.id}, Teacher={r.teacher_id}, Balance={r.current_balance}")
