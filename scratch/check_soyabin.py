from sqlalchemy import create_engine, text
engine = create_engine('postgresql://postgres:admin123@127.0.0.1:5434/postgres')
teacher_id = '91209c01-909a-4d3b-b62e-2323cc8df736'
with engine.connect() as conn:
    print("--- SOYABIN RECEIPTS ---")
    res = conn.execute(text("SELECT item_name, item_code, quantity_kg, bill_no, receipt_date FROM stock_receipts WHERE teacher_id = :tid AND (item_name LIKE '%%सोयाबीन%%' OR item_code = 'F_SOYABIN')"), {"tid": teacher_id})
    for row in res:
        print(f"Name: {ascii(row.item_name)}, Code: {row.item_code}, Qty: {row.quantity_kg}, Bill: {row.bill_no}, Date: {row.receipt_date}")
    
    print("\n--- SOYABIN INVENTORY ---")
    res = conn.execute(text("SELECT item_name, item_code, current_balance, standard_group FROM inventory_stock WHERE teacher_id = :tid AND (item_name LIKE '%%सोयाबीन%%' OR item_code = 'F_SOYABIN')"), {"tid": teacher_id})
    for row in res:
        print(f"Name: {ascii(row.item_name)}, Code: {row.item_code}, Balance: {row.current_balance}, Group: {row.standard_group}")
