from sqlalchemy import create_engine, text

SQLALCHEMY_DATABASE_URL = "postgresql://postgres:admin123@127.0.0.1:5434/postgres"
engine = create_engine(SQLALCHEMY_DATABASE_URL)

with engine.connect() as conn:
    user_id = '91209c01-909a-4d3b-b62e-2323cc8df736'
    
    query = text("""
        SELECT item_name, quantity_kg, receipt_date, standard_group, bill_no, count(*)
        FROM stock_receipts 
        WHERE CAST(teacher_id AS TEXT) = :tid 
        GROUP BY item_name, quantity_kg, receipt_date, standard_group, bill_no
        HAVING count(*) > 1
    """)
    duplicates = conn.execute(query, {"tid": user_id}).fetchall()
    print(f"Duplicate Receipt Groups: {len(duplicates)}")
    for d in duplicates:
        print(d)
        
    query = text("""
        SELECT item_name, count(*) 
        FROM menu_master 
        WHERE CAST(teacher_id AS TEXT) = :tid
        GROUP BY item_name
        HAVING count(*) > 1
    """)
    dup_menu = conn.execute(query, {"tid": user_id}).fetchall()
    print(f"\nDuplicate Menu Items: {len(dup_menu)}")
    for d in dup_menu:
        print(d)
