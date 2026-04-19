from sqlalchemy import create_engine, text
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

SQLALCHEMY_DATABASE_URL = "postgresql://postgres:admin123@127.0.0.1:5434/postgres"
engine = create_engine(SQLALCHEMY_DATABASE_URL)

with engine.connect() as conn:
    user_id = '91209c01-909a-4d3b-b62e-2323cc8df736'
    
    # 1. Fetch March Snapshot
    query = text("""
        SELECT report_data FROM monthly_reports 
        WHERE CAST(teacher_id AS TEXT) = :tid AND report_month = 3 AND report_year = 2026
    """)
    march = conn.execute(query, {"tid": user_id}).fetchone()
    prev_balances = {}
    if march:
        print("March Snapshot Found.")
        data = json.loads(march[0])
        for row in data:
            prev_balances[row['item']] = float(row['closingBalance'])
    else:
        print("March Snapshot NOT Found. Simulating reconstruction...")
        # (Simplified reconstruction)
        prev_balances = {"तांदूळ": -114.2} # From my previous check
        
    # 2. Fetch April Receipts
    query = text("""
        SELECT item_name, quantity_kg, bill_no
        FROM stock_receipts 
        WHERE CAST(teacher_id AS TEXT) = :tid 
        AND receipt_date >= '2026-04-01' AND receipt_date <= '2026-04-30'
    """)
    receipts = conn.execute(query, {"tid": user_id}).fetchall()
    mid_month_opening = {}
    received_sums = {}
    for r in receipts:
        if r[2] == 'OPENING_BALANCE':
            mid_month_opening[r[0]] = mid_month_opening.get(r[0], 0) + float(r[1])
        else:
            received_sums[r[0]] = received_sums.get(r[0], 0) + float(r[1])
            
    print(f"April Mid-Month Opening: {mid_month_opening}")
    
    # 3. Calculate April Opening
    rice_open = prev_balances.get("तांदूळ", 0) + mid_month_opening.get("तांदूळ", 0)
    print(f"April Rice Opening: {rice_open}")
