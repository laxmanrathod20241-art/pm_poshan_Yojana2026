from sqlalchemy import create_engine, text
engine = create_engine('postgresql://postgres:admin123@127.0.0.1:5434/postgres')
with engine.connect() as conn:
    res = conn.execute(text("SELECT id, item_name, teacher_id FROM item_ledger_reports"))
    for row in res:
        print(f"ID: {row.id}, Item: {ascii(row.item_name)}, Teacher: {row.teacher_id}")
