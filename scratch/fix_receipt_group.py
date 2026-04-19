from sqlalchemy import create_engine, text
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

engine = create_engine("postgresql://postgres:admin123@127.0.0.1:5434/postgres")

teacher_id = "91209c01-909a-4d3b-b62e-2323cc8df736"

with engine.connect() as conn:
    print(f"--- Fixing Standard Group for Tandul Debt: {teacher_id} ---")
    
    # 1. Update the existing negative receipt to have standard_group = 'primary'
    res = conn.execute(text("""
        UPDATE stock_receipts 
        SET standard_group = 'primary' 
        WHERE CAST(teacher_id AS TEXT) = :tid 
        AND item_code = 'F_TANDUL' 
        AND bill_no = 'OPENING_BALANCE'
    """), {"tid": teacher_id})
    print(f"Receipts updated: {res.rowcount}")
    
    # 2. Also ensure the 500kg receipt has it
    res = conn.execute(text("""
        UPDATE stock_receipts 
        SET standard_group = 'primary' 
        WHERE CAST(teacher_id AS TEXT) = :tid 
        AND item_code = 'F_TANDUL' 
        AND quantity_kg = 500
    """), {"tid": teacher_id})
    print(f"500kg Receipts updated: {res.rowcount}")
    
    conn.commit()
    print("✅ Done!")
