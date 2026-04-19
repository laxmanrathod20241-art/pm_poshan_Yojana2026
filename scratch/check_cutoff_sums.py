from sqlalchemy import create_engine, text

SQLALCHEMY_DATABASE_URL = "postgresql://postgres:admin123@127.0.0.1:5434/postgres"
engine = create_engine(SQLALCHEMY_DATABASE_URL)

with engine.connect() as conn:
    user_id = '91209c01-909a-4d3b-b62e-2323cc8df736'
    
    for date in ['2026-04-01', '2026-05-01']:
        query = text("""
            SELECT SUM(quantity_kg)
            FROM stock_receipts 
            WHERE CAST(teacher_id AS TEXT) = :tid AND receipt_date < :cutoff
            AND item_name = 'तांदूळ'
        """)
        res = conn.execute(query, {"tid": user_id, "cutoff": date}).fetchone()[0]
        print(f"Receipts before {date}: {res}")
