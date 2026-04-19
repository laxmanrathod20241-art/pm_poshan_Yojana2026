from sqlalchemy import create_engine, text
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

engine = create_engine("postgresql://postgres:admin123@127.0.0.1:5434/postgres")

teacher_id = "91209c01-909a-4d3b-b62e-2323cc8df736"

with engine.connect() as conn:
    print(f"--- Hard Fixing Kanda Masala for Teacher: {teacher_id} ---")
    
    # 1. Update the balance to 0 directly
    res = conn.execute(text("""
        UPDATE inventory_stock 
        SET current_balance = 0 
        WHERE CAST(teacher_id AS TEXT) = :tid 
        AND item_name = 'कांदामसाला'
    """), {"tid": teacher_id})
    print(f"Rows updated: {res.rowcount}")
    
    # 2. Delete any receipt that might be causing this if it exists
    res = conn.execute(text("""
        DELETE FROM stock_receipts 
        WHERE CAST(teacher_id AS TEXT) = :tid 
        AND quantity_kg < -100
    """), {"tid": teacher_id})
    print(f"Erronous receipts deleted: {res.rowcount}")
    
    conn.commit()
    print("✅ Done!")
