from sqlalchemy import create_engine, text
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

engine = create_engine("postgresql://postgres:admin123@127.0.0.1:5434/postgres")

teacher_id = "91209c01-909a-4d3b-b62e-2323cc8df736"

with engine.connect() as conn:
    print("--- Kanda Masala (कांदामसाला) History Check ---")
    
    # Check all receipts for this item
    res = conn.execute(text("""
        SELECT receipt_date, quantity_kg, bill_no 
        FROM stock_receipts 
        WHERE CAST(teacher_id AS TEXT) = :tid 
        AND item_name = 'कांदामसाला'
        ORDER BY receipt_date
    """), {"tid": teacher_id})
    print("\nReceipts Found:")
    receipts = res.fetchall()
    for r in receipts:
        print(f" - {r.receipt_date}: {r.quantity_kg}kg ({r.bill_no})")
    
    # Check consumption logs for this item
    res = conn.execute(text("""
        SELECT log_date, meals_served_primary 
        FROM consumption_logs 
        WHERE CAST(teacher_id AS TEXT) = :tid 
        AND (main_foods_all::text LIKE '%%कांदामसाला%%' OR ingredients_used::text LIKE '%%कांदामसाला%%')
        ORDER BY log_date
    """), {"tid": teacher_id})
    print("\nConsumption Found:")
    logs = res.fetchall()
    for r in logs:
        print(f" - {r.log_date}: Served {r.meals_served_primary}")

    if not receipts and not logs:
        print("\n⚠️ NO DATA FOUND AT ALL for Kanda Masala in the database.")
    else:
        print("\n✅ Data exists. The report should show values.")
