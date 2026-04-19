from sqlalchemy import create_engine, text
import json
engine = create_engine('postgresql://postgres:admin123@127.0.0.1:5434/postgres')
teacher_id = '91209c01-909a-4d3b-b62e-2323cc8df736'
output = []
with engine.connect() as conn:
    output.append("--- INVENTORY STOCK ---")
    res = conn.execute(text("SELECT item_name, current_balance, standard_group FROM inventory_stock WHERE teacher_id = :tid"), {"tid": teacher_id})
    for row in res:
        output.append(f"Item: {row.item_name}, Balance: {row.current_balance}, Group: {row.standard_group}")
    
    output.append("\n--- STOCK RECEIPTS ---")
    res = conn.execute(text("SELECT item_name, quantity_kg, receipt_date, standard_group FROM stock_receipts WHERE teacher_id = :tid ORDER BY created_at DESC LIMIT 20"), {"tid": teacher_id})
    for row in res:
        output.append(f"Item: {row.item_name}, Qty: {row.quantity_kg}, Date: {row.receipt_date}, Group: {row.standard_group}")

with open('stock_dump.txt', 'w', encoding='utf-8') as f:
    f.write("\n".join(output))
