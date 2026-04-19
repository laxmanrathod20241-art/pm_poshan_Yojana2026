from sqlalchemy import create_engine, text
import json
engine = create_engine('postgresql://postgres:admin123@127.0.0.1:5434/postgres')
teacher_id = '91209c01-909a-4d3b-b62e-2323cc8df736'
with engine.connect() as conn:
    res = conn.execute(text("SELECT report_month, report_year, report_data FROM monthly_reports WHERE teacher_id = :tid"), {"tid": teacher_id})
    for row in res:
        print(f"Month: {row.report_month}/{row.report_year}")
        data = row.report_data
        if isinstance(data, str):
            data = json.loads(data)
        for item in data:
            if 'सोयाबीन' in item.get('item', '') or 'Soyabean' in item.get('item', ''):
                print(f"  Item: {ascii(item.get('item'))}, Opening: {item.get('openingBalance')}, Consumed: {item.get('consumed')}")
            if 'तांदूळ' in item.get('item', '') or 'Rice' in item.get('item', ''):
                print(f"  Item: {ascii(item.get('item'))}, Opening: {item.get('openingBalance')}, Consumed: {item.get('consumed')}")
