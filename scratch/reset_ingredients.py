from sqlalchemy import create_engine, text
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

engine = create_engine("postgresql://postgres:admin123@127.0.0.1:5434/postgres")

teacher_id = "91209c01-909a-4d3b-b62e-2323cc8df736"

with engine.connect() as conn:
    print("--- Resetting Corrupted Ingredient Balances ---")
    
    # We saw that 'कांदामसाला' had -3.39kg because it was previously misidentified as Rice.
    # We will reset all negative balances for non-rice items to 0 to clear this corruption.
    
    res = conn.execute(text("""
        UPDATE inventory_stock 
        SET current_balance = 0 
        WHERE teacher_id = :tid 
        AND item_code != 'F_TANDUL' 
        AND current_balance < 0
    """), {"tid": teacher_id})
    
    print(f"Reset {res.rowcount} corrupted ingredient entries to 0.")
    
    conn.commit()
    print("\n--- Success ---")
