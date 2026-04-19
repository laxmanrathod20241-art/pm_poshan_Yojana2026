from sqlalchemy import create_engine, text
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

SQLALCHEMY_DATABASE_URL = "postgresql://postgres:admin123@127.0.0.1:5434/postgres"
engine = create_engine(SQLALCHEMY_DATABASE_URL)

with engine.connect() as conn:
    user_id = '91209c01-909a-4d3b-b62e-2323cc8df736'
    cutoff = '2026-04-01'
    
    # Simulate reconstructOpeningBalances for Rice
    # 1. Receipts before cutoff
    query = text("""
        SELECT item_name, quantity_kg, standard_group
        FROM stock_receipts 
        WHERE CAST(teacher_id AS TEXT) = :tid 
        AND receipt_date < :cutoff
        AND item_name = 'तांदूळ'
    """)
    receipts = conn.execute(query, {"tid": user_id, "cutoff": cutoff}).fetchall()
    print("Receipts before April:")
    for r in receipts:
        print(r)
        
    # 2. Consumption before cutoff
    query = text("""
        SELECT meals_served_primary, meals_served_upper_primary, main_foods_all, ingredients_used
        FROM consumption_logs
        WHERE CAST(teacher_id AS TEXT) = :tid
        AND log_date < :cutoff
    """)
    # (Assuming consumption also affects rice)
    # But I'll just check if there are many logs
    logs = conn.execute(query, {"tid": user_id, "cutoff": cutoff}).fetchall()
    print(f"\nConsumption logs before April: {len(logs)}")
