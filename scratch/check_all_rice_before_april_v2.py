from sqlalchemy import create_engine, text
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

SQLALCHEMY_DATABASE_URL = "postgresql://postgres:admin123@127.0.0.1:5434/postgres"
engine = create_engine(SQLALCHEMY_DATABASE_URL)

with engine.connect() as conn:
    user_id = '91209c01-909a-4d3b-b62e-2323cc8df736'
    
    query = text("""
        SELECT item_name, quantity_kg, standard_group
        FROM stock_receipts 
        WHERE CAST(teacher_id AS TEXT) = :tid AND receipt_date < '2026-04-01'
        AND item_name = 'तांदूळ'
    """)
    result = conn.execute(query, {"tid": user_id}).fetchall()
    
    rows = []
    for r in result:
        rows.append({
            "item": r[0],
            "qty": float(r[1]),
            "group": r[2]
        })
    print(json.dumps(rows, ensure_ascii=False, indent=2))
