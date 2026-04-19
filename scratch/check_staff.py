from sqlalchemy import create_engine, text

SQLALCHEMY_DATABASE_URL = "postgresql://postgres:admin123@127.0.0.1:5434/postgres"
engine = create_engine(SQLALCHEMY_DATABASE_URL)

with engine.connect() as conn:
    user_id = '91209c01-909a-4d3b-b62e-2323cc8df736'
    
    query = text("""
        SELECT id, staff_name, monthly_cost, standard_group, payment_type
        FROM cooking_staff 
        WHERE CAST(teacher_id AS TEXT) = :tid
    """)
    result = conn.execute(query, {"tid": user_id}).fetchall()
    print("Cooking Staff:")
    for r in result:
        print(r)
