from sqlalchemy import create_engine, text
engine = create_engine('postgresql://postgres:admin123@127.0.0.1:5434/postgres')
with engine.connect() as conn:
    res = conn.execute(text("SELECT id, email FROM profiles WHERE email LIKE '%pratibha%'"))
    for row in res:
        print(row.id, row.email)
