from sqlalchemy import create_engine, text
engine = create_engine('postgresql://postgres:admin123@127.0.0.1:5434/postgres')
teacher_id = '91209c01-909a-4d3b-b62e-2323cc8df736'
with engine.connect() as conn:
    res = conn.execute(text("SELECT id, item_name, quantity_kg, bill_no FROM stock_receipts WHERE teacher_id = :tid AND (quantity_kg = 500 OR quantity_kg = -500)"), {"tid": teacher_id})
    for row in res:
        print(f"ID: {row.id}, Name: {ascii(row.item_name)}, Qty: {row.quantity_kg}, Bill: {row.bill_no}")
