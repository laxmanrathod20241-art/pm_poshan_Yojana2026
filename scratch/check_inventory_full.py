from sqlalchemy import create_engine, text
engine = create_engine('postgresql://postgres:admin123@127.0.0.1:5434/postgres')
teacher_id = '91209c01-909a-4d3b-b62e-2323cc8df736'
with engine.connect() as conn:
    res = conn.execute(text("SELECT id, item_name, item_code, current_balance FROM inventory_stock WHERE teacher_id = :tid"), {"tid": teacher_id})
    for row in res:
        print(f"ID: {row.id}, Name: {ascii(row.item_name)}, Code: {row.item_code}, Balance: {row.current_balance}")
