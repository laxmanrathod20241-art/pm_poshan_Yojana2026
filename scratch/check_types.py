from sqlalchemy import create_engine, text

SQLALCHEMY_DATABASE_URL = "postgresql://postgres:admin123@127.0.0.1:5434/postgres"
engine = create_engine(SQLALCHEMY_DATABASE_URL)

with engine.connect() as conn:
    res = conn.execute(text("SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name IN ('stock_receipts', 'profiles') AND column_name = 'teacher_id' OR (table_name='profiles' AND column_name='id')"))
    for row in res:
        print(row)
