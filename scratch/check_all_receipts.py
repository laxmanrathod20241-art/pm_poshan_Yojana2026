from sqlalchemy import create_engine, text
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

SQLALCHEMY_DATABASE_URL = "postgresql://postgres:admin123@127.0.0.1:5434/postgres"
engine = create_engine(SQLALCHEMY_DATABASE_URL)

with engine.connect() as conn:
    user_id = '91209c01-909a-4d3b-b62e-2323cc8df736'
    
    query = text("""
        SELECT id, item_name, quantity_kg, receipt_date, standard_group, bill_no
        FROM stock_receipts 
        WHERE CAST(teacher_id AS TEXT) = :tid 
        ORDER BY receipt_date ASC
    """)
    result = conn.execute(query, {"tid": user_id})
    
    rows = []
    for r in result:
        rows.append({
            "id": str(r[0]),
            "item": r[1],
            "qty": float(r[2]),
            "date": str(r[3]),
            "group": r[4],
            "bill": r[5]
        })
    
    print(json.dumps(rows, ensure_ascii=False, indent=2))
