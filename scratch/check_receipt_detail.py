from sqlalchemy import create_engine, text
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

engine = create_engine("postgresql://postgres:admin123@127.0.0.1:5434/postgres")

with engine.connect() as conn:
    print("--- Detailed Receipt Check ---")
    res = conn.execute(text("""
        SELECT item_name, item_code, quantity_kg 
        FROM stock_receipts 
        WHERE id = '3ff5f510-d59f-4b13-9624-a17f45a8b0df'
    """))
    for r in res:
        print(f"Name on Receipt: {r.item_name}")
        print(f"Code on Receipt: {r.item_code}")
        print(f"Qty on Receipt: {r.quantity_kg}")
