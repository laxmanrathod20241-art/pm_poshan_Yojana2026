from sqlalchemy import create_engine, text
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

engine = create_engine("postgresql://postgres:admin123@127.0.0.1:5434/postgres")

teacher_id = "91209c01-909a-4d3b-b62e-2323cc8df736"

with engine.connect() as conn:
    print("--- Hunting for the 'Ghost' -114.200 kg ---")
    res = conn.execute(text("""
        SELECT id, receipt_date, quantity_kg, item_name, bill_no 
        FROM stock_receipts 
        WHERE CAST(teacher_id AS TEXT) = :tid 
        AND quantity_kg < -50
    """), {"tid": teacher_id})
    rows = res.fetchall()
    if not rows:
        print("No negative entries found in stock_receipts.")
    for r in rows:
        print(f"Found Entry: ID={r.id}, Date={r.receipt_date}, Item={r.item_name}, Qty={r.quantity_kg}, Bill={r.bill_no}")
        
    print("\n--- Checking Consumption Logs for weirdness ---")
    # Maybe a log has a crazy attendance?
    res = conn.execute(text("""
        SELECT log_date, meals_served_primary, main_foods_all, ingredients_used 
        FROM consumption_logs 
        WHERE CAST(teacher_id AS TEXT) = :tid 
        AND (meals_served_primary > 10000)
    """), {"tid": teacher_id})
    for r in res:
        print(f"Found Crazy Log: Date={r.log_date}, Attendance={r.meals_served_primary}")
