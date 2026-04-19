from sqlalchemy import create_engine, text

SQLALCHEMY_DATABASE_URL = "postgresql://postgres:admin123@127.0.0.1:5434/postgres"
engine = create_engine(SQLALCHEMY_DATABASE_URL)

with engine.connect() as conn:
    user_id = '91209c01-909a-4d3b-b62e-2323cc8df736'
    
    query = text("""
        SELECT id, report_month, report_year, standard_group
        FROM monthly_reports 
        WHERE CAST(teacher_id AS TEXT) = :tid 
        ORDER BY report_year, report_month
    """)
    result = conn.execute(query, {"tid": user_id})
    
    for r in result:
        print(f"ID: {r[0]}, Month: {r[1]}, Year: {r[2]}, Group: {r[3]}")
