from sqlalchemy import create_engine, text
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

SQLALCHEMY_DATABASE_URL = "postgresql://postgres:admin123@127.0.0.1:5434/postgres"
engine = create_engine(SQLALCHEMY_DATABASE_URL)

with engine.connect() as conn:
    # 1. Find User
    result = conn.execute(text("SELECT id, email FROM profiles WHERE email LIKE '%pratibhap154%'"))
    user = result.fetchone()
    if user:
        user_id = user[0]
        print(f"User ID: {user_id}")
        
        # 2. Find Stock Receipts
        result = conn.execute(text("SELECT id, item_name, quantity_kg, receipt_date, bill_no FROM stock_receipts WHERE CAST(teacher_id AS TEXT) = :tid"), {"tid": str(user_id)})
        receipts = result.fetchall()
        print("\nStock Receipts:")
        for r in receipts:
            # Print only ID and Bill to avoid Marathi encoding issues if sys.stdout fails
            print(f"ID: {r[0]}, Item: [MARATHI_NAME], Qty: {r[2]}, Date: {r[3]}, Bill: {r[4]}")
            
    else:
        print("User not found.")
