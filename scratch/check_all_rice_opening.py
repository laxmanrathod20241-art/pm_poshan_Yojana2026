from sqlalchemy import create_engine, text
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

SQLALCHEMY_DATABASE_URL = "postgresql://postgres:admin123@127.0.0.1:5434/postgres"
engine = create_engine(SQLALCHEMY_DATABASE_URL)

with engine.connect() as conn:
    query = text("""
        SELECT item_name, quantity_kg, receipt_date, teacher_id
        FROM stock_receipts 
        WHERE bill_no = 'OPENING_BALANCE'
        AND item_name = 'तांदूळ'
    """)
    result = conn.execute(query)
    
    rows = []
    for r in result:
        rows.append({
            "item": r[0],
            "qty": float(r[1]),
            "date": str(r[2]),
            "tid": str(r[3])
        })
    
    print(json.dumps(rows, ensure_ascii=False, indent=2))
