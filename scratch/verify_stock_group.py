from sqlalchemy import create_engine, text
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

engine = create_engine("postgresql://postgres:admin123@127.0.0.1:5434/postgres")

with engine.connect() as conn:
    res = conn.execute(text("SELECT item_name, standard_group FROM inventory_stock WHERE item_code = 'F_TANDUL' AND CAST(teacher_id AS TEXT) = '91209c01-909a-4d3b-b62e-2323cc8df736'"))
    for r in res:
        print(f"Item: {r.item_name}, Group: {r.standard_group}")
