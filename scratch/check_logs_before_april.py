from sqlalchemy import create_engine, text

SQLALCHEMY_DATABASE_URL = "postgresql://postgres:admin123@127.0.0.1:5434/postgres"
engine = create_engine(SQLALCHEMY_DATABASE_URL)

with engine.connect() as conn:
    user_id = '91209c01-909a-4d3b-b62e-2323cc8df736'
    
    query = text("""
        SELECT log_date, meals_served_primary, meals_served_upper_primary
        FROM daily_logs 
        WHERE CAST(teacher_id AS TEXT) = :tid AND log_date < '2026-04-01'
    """)
    result = conn.execute(query, {"tid": user_id}).fetchall()
    print("Daily Logs before April:")
    for r in result:
        print(r)
