from sqlalchemy import create_engine, text
import json

SQLALCHEMY_DATABASE_URL = "postgresql://postgres:admin123@127.0.0.1:5434/postgres"
engine = create_engine(SQLALCHEMY_DATABASE_URL)

with engine.connect() as conn:
    user_id = '91209c01-909a-4d3b-b62e-2323cc8df736'
    
    query = text("""
        SELECT item_name, quantity_kg, receipt_date, bill_no
        FROM stock_receipts 
        WHERE CAST(teacher_id AS TEXT) = :tid 
        AND bill_no = 'OPENING_BALANCE'
        ORDER BY item_name, receipt_date ASC
    """)
    result = conn.execute(query, {"tid": user_id})
    print("OPENING_BALANCE records:")
    for r in result:
        # Use repr() to show Marathi clearly in the log
        print(f"Item: {repr(r[0])}, Qty: {r[1]}, Date: {r[2]}")
