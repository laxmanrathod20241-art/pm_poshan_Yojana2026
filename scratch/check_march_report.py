from sqlalchemy import create_engine, text
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

SQLALCHEMY_DATABASE_URL = "postgresql://postgres:admin123@127.0.0.1:5434/postgres"
engine = create_engine(SQLALCHEMY_DATABASE_URL)

with engine.connect() as conn:
    user_id = '91209c01-909a-4d3b-b62e-2323cc8df736'
    
    query = text("""
        SELECT id, report_month, report_year, standard_group, report_data
        FROM monthly_reports 
        WHERE CAST(teacher_id AS TEXT) = :tid 
        AND report_month = 3 AND report_year = 2026
    """)
    result = conn.execute(query, {"tid": user_id})
    
    found = False
    for r in result:
        found = True
        print(f"ID: {r[0]}, Month: {r[1]}, Year: {r[2]}, Group: {r[3]}")
        data = r[4]
        if isinstance(data, str):
            data = json.loads(data)
        print(json.dumps(data[:1], ensure_ascii=False, indent=2))
        
    if not found:
        print("March report NOT found.")
