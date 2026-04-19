from sqlalchemy import create_engine, text
engine = create_engine('postgresql://postgres:admin123@127.0.0.1:5434/postgres')
teacher_id = '91209c01-909a-4d3b-b62e-2323cc8df736'
with engine.connect() as conn:
    res = conn.execute(text("SELECT item_name, item_code FROM menu_master WHERE teacher_id = :tid"), {"tid": teacher_id})
    for row in res:
        print(f"Name: {ascii(row.item_name)}, Code: {row.item_code}")
