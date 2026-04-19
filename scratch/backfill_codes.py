from sqlalchemy import create_engine, text
engine = create_engine('postgresql://postgres:admin123@127.0.0.1:5434/postgres')
teacher_id = '91209c01-909a-4d3b-b62e-2323cc8df736'

with engine.connect() as conn:
    # 1. Get name -> code mapping from menu_master
    res = conn.execute(text("SELECT item_name, item_code FROM menu_master WHERE teacher_id = :tid"), {"tid": teacher_id})
    mapping = {row.item_name: row.item_code for row in res}
    print(f"Loaded {len(mapping)} mappings.")

    # 2. Update inventory_stock
    for name, code in mapping.items():
        conn.execute(text("""
            UPDATE inventory_stock 
            SET item_code = :code 
            WHERE teacher_id = :tid 
            AND item_name = :name 
            AND item_code IS NULL
        """), {"code": code, "tid": teacher_id, "name": name})
    
    # 3. Update stock_receipts
    for name, code in mapping.items():
        conn.execute(text("""
            UPDATE stock_receipts 
            SET item_code = :code 
            WHERE teacher_id = :tid 
            AND item_name = :name 
            AND item_code IS NULL
        """), {"code": code, "tid": teacher_id, "name": name})
    
    conn.commit()
    print("Backfill complete.")
