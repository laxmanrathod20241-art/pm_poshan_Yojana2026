from sqlalchemy import create_engine, text

SQLALCHEMY_DATABASE_URL = "postgresql://postgres:admin123@127.0.0.1:5434/postgres"
engine = create_engine(SQLALCHEMY_DATABASE_URL)

with engine.connect() as conn:
    user_id = '91209c01-909a-4d3b-b62e-2323cc8df736'
    
    query = text("""
        SELECT COUNT(*) FROM stock_receipts 
        WHERE CAST(teacher_id AS TEXT) = :tid 
        AND item_name = 'तांदूळ'
        AND bill_no = 'OPENING_BALANCE'
    """)
    count = conn.execute(query, {"tid": user_id}).fetchone()[0]
    print(f"Rice Opening Balance Records Count: {count}")
    
    query = text("""
        SELECT id, receipt_date, quantity_kg FROM stock_receipts 
        WHERE CAST(teacher_id AS TEXT) = :tid 
        AND item_name = 'तांदूळ'
        AND bill_no = 'OPENING_BALANCE'
    """)
    rows = conn.execute(query, {"tid": user_id}).fetchall()
    for r in rows:
        print(r)
