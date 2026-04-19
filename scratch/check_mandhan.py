from sqlalchemy import create_engine, text

SQLALCHEMY_DATABASE_URL = "postgresql://postgres:admin123@127.0.0.1:5434/postgres"
engine = create_engine(SQLALCHEMY_DATABASE_URL)

with engine.connect() as conn:
    user_id = '91209c01-909a-4d3b-b62e-2323cc8df736'
    
    query = text("""
        SELECT staff_total, fuel_total, veg_total, is_applicable
        FROM monthly_mandhan 
        WHERE CAST(teacher_id AS TEXT) = :tid 
        AND report_month = 4 AND report_year = 2026
    """)
    result = conn.execute(query, {"tid": user_id}).fetchone()
    if result:
        print(f"Mandhan Snapshot: Staff={result[0]}, Fuel={result[1]}, Veg={result[2]}, Applicable={result[3]}")
    else:
        print("No Mandhan Snapshot found.")
