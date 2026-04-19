from sqlalchemy import create_engine, text
import sys
import uuid

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

engine = create_engine("postgresql://postgres:admin123@127.0.0.1:5434/postgres")

teacher_id = "91209c01-909a-4d3b-b62e-2323cc8df736"

with engine.connect() as conn:
    print(f"--- Restoring Tandul Debt for Teacher: {teacher_id} ---")
    
    # 1. Add the negative receipt back for Tandul specifically
    new_receipt_id = str(uuid.uuid4())
    conn.execute(text("""
        INSERT INTO stock_receipts (id, teacher_id, item_name, item_code, quantity_kg, receipt_date, bill_no) 
        VALUES (:id, :tid, 'तांदूळ', 'F_TANDUL', -114.200, '2026-04-01', 'OPENING_BALANCE')
    """), {"id": new_receipt_id, "tid": teacher_id})
    print(" - Negative receipt restored for तांदूळ (Tandul).")
    
    # 2. Update the inventory_stock balance for Tandul
    # Current balance was 503.35. We need to subtract 114.2 from it.
    res = conn.execute(text("SELECT id, current_balance FROM inventory_stock WHERE CAST(teacher_id AS TEXT) = :tid AND item_code = 'F_TANDUL'"), {"tid": teacher_id})
    row = res.fetchone()
    if row:
        new_bal = float(row.current_balance) - 114.2
        conn.execute(text("UPDATE inventory_stock SET current_balance = :bal WHERE id = :id"), {"bal": new_bal, "id": row.id})
        print(f" - Tandul balance updated: {row.current_balance} -> {new_bal}")
    
    conn.commit()
    print("✅ Done!")
