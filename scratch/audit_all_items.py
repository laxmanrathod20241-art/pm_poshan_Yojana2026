from sqlalchemy import create_engine, text
import sys
import json

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

engine = create_engine("postgresql://postgres:admin123@127.0.0.1:5434/postgres")

teacher_id = "91209c01-909a-4d3b-b62e-2323cc8df736"

with engine.connect() as conn:
    print("--- Stock Receipts Audit ---")
    res = conn.execute(text("""
        SELECT item_name, quantity_kg, receipt_date, bill_no, standard_group 
        FROM stock_receipts 
        WHERE CAST(teacher_id AS TEXT) = :tid
        ORDER BY item_name, receipt_date
    """), {"tid": teacher_id})
    for r in res:
        print(f"Item: {r.item_name}, Qty: {r.quantity_kg}, Date: {r.receipt_date}, Bill: {r.bill_no}, Group: {r.standard_group}")
    
    print("\n--- Consumption Logs Audit (Kanda Masala Only) ---")
    # Using JSONB containment operator @>
    search_item = json.dumps(["कांदामसाला"])
    res = conn.execute(text("""
        SELECT log_date, main_foods_all, ingredients_used 
        FROM consumption_logs 
        WHERE CAST(teacher_id AS TEXT) = :tid
        AND (main_foods_all @> :item OR ingredients_used @> :item)
    """), {"tid": teacher_id, "item": search_item})
    for r in res:
        print(f"Date: {r.log_date}, Main: {r.main_foods_all}, Ing: {r.ingredients_used}")
