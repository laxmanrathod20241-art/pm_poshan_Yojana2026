from sqlalchemy import create_engine, text

SQLALCHEMY_DATABASE_URL = "postgresql://postgres:admin123@127.0.0.1:5434/postgres"
engine = create_engine(SQLALCHEMY_DATABASE_URL)

with engine.connect() as conn:
    query = text("""
        SELECT id, email, role FROM profiles WHERE email LIKE '%pratibhap154%'
    """)
    result = conn.execute(query).fetchall()
    for r in result:
        print(r)
