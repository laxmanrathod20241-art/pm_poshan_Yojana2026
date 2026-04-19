from sqlalchemy import create_engine, text
import json

SQLALCHEMY_DATABASE_URL = "postgresql://postgres:admin123@127.0.0.1:5434/postgres"
engine = create_engine(SQLALCHEMY_DATABASE_URL)

with engine.connect() as conn:
    # 1. Find User
    result = conn.execute(text("SELECT id, email, username FROM profiles WHERE email LIKE '%pratibhap154%' OR username LIKE '%pratibhap154%'"))
    user = result.fetchone()
    if user:
        user_id = user[0]
        print(f"User ID: {user_id}")
        
        # 2. Find Stock Receipts (Declarations)
        result = conn.execute(text("SELECT id, item_name, quantity_kg, receipt_date, source FROM stock_receipts WHERE teacher_id = :tid"), {"tid": user_id})
        receipts = result.fetchall()
        print("\nStock Receipts:")
        for r in receipts:
            print(r)
            
        # 3. Find Inventory Stock
        result = conn.execute(text("SELECT id, item_name, current_balance FROM inventory_stock WHERE teacher_id = :tid"), {"tid": user_id})
        stocks = result.fetchall()
        print("\nInventory Stock balances:")
        for s in stocks:
            print(s)
    else:
        print("User not found.")
