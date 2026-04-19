from sqlalchemy import create_engine, text
import json
engine = create_engine('postgresql://postgres:admin123@127.0.0.1:5434/postgres')
teacher_id = '91209c01-909a-4d3b-b62e-2323cc8df736'

GRAMS_PRIMARY = 100
GRAMS_UPPER = 150

with engine.connect() as conn:
    # 1. Get all receipts
    receipts_res = conn.execute(text("SELECT item_name, quantity_kg FROM stock_receipts WHERE teacher_id = :tid"), {"tid": teacher_id})
    balances = {}
    for row in receipts_res:
        name = row.item_name
        balances[name] = balances.get(name, 0) + float(row.quantity_kg)
    
    # 2. Get all consumption
    logs_res = conn.execute(text("SELECT meals_served_primary, meals_served_upper_primary, main_foods_all, ingredients_used FROM consumption_logs WHERE teacher_id = :tid"), {"tid": teacher_id})
    for row in logs_res:
        p = float(row.meals_served_primary or 0)
        u = float(row.meals_served_upper_primary or 0)
        consumed_kg = ((p * GRAMS_PRIMARY) + (u * GRAMS_UPPER)) / 1000.0
        
        items = set()
        if row.main_foods_all:
            items.update(row.main_foods_all)
        if row.ingredients_used:
            items.update(row.ingredients_used)
        
        for item in items:
            balances[item] = balances.get(item, 0) - consumed_kg
            
    # 3. Update inventory_stock
    for name, balance in balances.items():
        print(f"Item: {ascii(name)}, Corrected Balance: {balance}")
        conn.execute(text("UPDATE inventory_stock SET current_balance = :bal WHERE teacher_id = :tid AND item_name = :name"), 
                     {"bal": balance, "tid": teacher_id, "name": name})
    
    conn.commit()
print("Inventory balances re-synchronized successfully.")
