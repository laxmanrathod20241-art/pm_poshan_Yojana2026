from sqlalchemy import create_engine, text
engine = create_engine("postgresql://postgres:admin123@127.0.0.1:5434/postgres")
with engine.connect() as conn:
    res = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'"))
    print([r[0] for r in res])
