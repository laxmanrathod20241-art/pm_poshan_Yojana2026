from sqlalchemy import create_engine, text
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

engine = create_engine("postgresql://postgres:admin123@127.0.0.1:5434/postgres")

with engine.connect() as conn:
    print("--- Consumption Logs Column Types ---")
    res = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'consumption_logs'"))
    for r in res:
        print(f"{r.column_name}: {r.data_type}")
