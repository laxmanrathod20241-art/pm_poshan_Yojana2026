from sqlalchemy import create_engine, text
import json
engine = create_engine('postgresql://postgres:admin123@127.0.0.1:5434/postgres')
teacher_id = '91209c01-909a-4d3b-b62e-2323cc8df736'
with engine.connect() as conn:
    res = conn.execute(text("SELECT item_name, report_data FROM item_ledger_reports WHERE teacher_id = :tid"), {"tid": teacher_id})
    for row in res:
        print(f"Item: {ascii(row.item_name)}")
        data = row.report_data
        if isinstance(data, str):
            data = json.loads(data)
        if 'matrix' in data and len(data['matrix']) > 0:
            print(f"  First Opening: {data['matrix'][0].get('opening')}")
