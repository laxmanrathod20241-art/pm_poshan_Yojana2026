from sqlalchemy import create_engine, text
import sys

# Ensure UTF-8 output if possible, or avoid printing Marathi
sys.stdout.reconfigure(encoding='utf-8')

SQLALCHEMY_DATABASE_URL = "postgresql://postgres:admin123@127.0.0.1:5434/postgres"
engine = create_engine(SQLALCHEMY_DATABASE_URL)

with engine.connect() as conn:
    user_id = '91209c01-909a-4d3b-b62e-2323cc8df736'
    
    # Check receipts in March and April
    query = text("""
        SELECT item_name, quantity_kg, receipt_date, bill_no
        FROM stock_receipts 
        WHERE CAST(teacher_id AS TEXT) = :tid 
        AND receipt_date >= '2026-03-01'
        ORDER BY receipt_date ASC
    """)
    result = conn.execute(query, {"tid": user_id})
    print("Stock Receipts (March-April):")
    for r in result:
        # Avoid printing Marathi item_name if it fails
        print(f"Date: {r[2]}, Qty: {r[1]}, Bill: {r[3]}, Item_Hash: {hash(r[0])}")
        
    # Check consumption logs in March
    query = text("""
        SELECT log_date, meals_served_primary, meals_served_upper_primary
        FROM daily_logs
        WHERE CAST(teacher_id AS TEXT) = :tid
        AND log_date >= '2026-03-01' AND log_date <= '2026-03-31'
    """)
    result = conn.execute(query, {"tid": user_id})
    print("\nDaily Logs (March):")
    for r in result:
        print(f"Date: {r[0]}, P: {r[1]}, U: {r[2]}")
