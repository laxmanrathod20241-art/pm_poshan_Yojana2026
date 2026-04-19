from sqlalchemy import create_engine, text
engine = create_engine("postgresql://postgres:admin123@127.0.0.1:5434/postgres")
with engine.connect() as conn:
    print("--- daily_logs Columns ---")
    res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='daily_logs'"))
    print([r[0] for r in res])
    
    print("\n--- consumption_logs Columns ---")
    res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='consumption_logs'"))
    print([r[0] for r in res])
