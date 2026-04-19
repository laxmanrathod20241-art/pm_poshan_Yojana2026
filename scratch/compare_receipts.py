from sqlalchemy import create_engine, text
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

engine = create_engine("postgresql://postgres:admin123@127.0.0.1:5434/postgres")

teacher_id = "91209c01-909a-4d3b-b62e-2323cc8df736"

with engine.connect() as conn:
    print("--- Kanda Masala Receipts ---")
    res = conn.execute(text("""
        SELECT id, receipt_date, quantity_kg, bill_no 
        FROM stock_receipts 
        WHERE CAST(teacher_id AS TEXT) = :tid 
        AND item_name = 'कांदामसाला'
    """), {"tid": teacher_id})
    for r in res:
        print(f"Receipt: ID={r.id}, Date={r.receipt_date}, Qty={r.quantity_kg}, Bill={r.bill_no}")
        
    print("\n--- Tandul Receipts ---")
    res = conn.execute(text("""
        SELECT id, receipt_date, quantity_kg, bill_no 
        FROM stock_receipts 
        WHERE CAST(teacher_id AS TEXT) = :tid 
        AND item_name = 'तांदूळ'
    """), {"tid": teacher_id})
    for r in res:
        print(f"Receipt: ID={r.id}, Date={r.receipt_date}, Qty={r.quantity_kg}, Bill={r.bill_no}")
