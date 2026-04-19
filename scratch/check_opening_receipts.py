from sqlalchemy import create_engine, text
engine = create_engine('postgresql://postgres:admin123@127.0.0.1:5434/postgres')
teacher_id = '91209c01-909a-4d3b-b62e-2323cc8df736'
with engine.connect() as conn:
    res = conn.execute(text("SELECT item_name, quantity_kg FROM stock_receipts WHERE teacher_id = :tid AND bill_no = 'OPENING_BALANCE'"), {"tid": teacher_id})
    for row in res:
        print(f"Item: {ascii(row.item_name)}, Opening Qty: {row.quantity_kg}")
