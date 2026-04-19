from sqlalchemy import create_engine, text

SQLALCHEMY_DATABASE_URL = "postgresql://postgres:admin123@127.0.0.1:5434/postgres"
engine = create_engine(SQLALCHEMY_DATABASE_URL)

with engine.connect() as conn:
    user_id = '91209c01-909a-4d3b-b62e-2323cc8df736'
    
    # Flip negative opening balances to positive
    query = text("""
        UPDATE stock_receipts 
        SET quantity_kg = ABS(quantity_kg)
        WHERE CAST(teacher_id AS TEXT) = :tid 
        AND bill_no = 'OPENING_BALANCE'
        AND quantity_kg < 0
    """)
    result = conn.execute(query, {"tid": user_id})
    print(f"Corrected {result.rowcount} negative opening balance records.")
    
    # Also delete the corrupted April snapshot to force recalculation
    query = text("""
        DELETE FROM monthly_reports 
        WHERE CAST(teacher_id AS TEXT) = :tid 
        AND report_month = 4 AND report_year = 2026
    """)
    result = conn.execute(query, {"tid": user_id})
    print(f"Deleted corrupted April report snapshot.")
    
    # Also fix the Mandhan snapshot if it exists
    query = text("""
        DELETE FROM monthly_mandhan 
        WHERE CAST(teacher_id AS TEXT) = :tid 
        AND report_month = 4 AND report_year = 2026
    """)
    result = conn.execute(query, {"tid": user_id})
    print(f"Deleted corrupted April mandhan snapshot.")
    
    conn.commit()
