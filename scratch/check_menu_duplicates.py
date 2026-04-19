from sqlalchemy import create_engine, text
engine = create_engine('postgresql://postgres:admin123@127.0.0.1:5434/postgres')
teacher_id = '91209c01-909a-4d3b-b62e-2323cc8df736'
with engine.connect() as conn:
    res = conn.execute(text("SELECT item_name, item_code FROM menu_master WHERE teacher_id = :tid"), {"tid": teacher_id})
    counts = {}
    for row in res:
        counts[row.item_name] = counts.get(row.item_name, 0) + 1
    for name, count in counts.items():
        if count > 1:
            print(f"Duplicate Name: {ascii(name)}, Count: {count}")
