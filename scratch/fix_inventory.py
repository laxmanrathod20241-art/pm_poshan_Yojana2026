from sqlalchemy import create_engine, text
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

engine = create_engine("postgresql://postgres:admin123@127.0.0.1:5434/postgres")

teacher_id = "91209c01-909a-4d3b-b62e-2323cc8df736"

with engine.connect() as conn:
    print("--- Fixing Inventory Codes and Balances ---")
    
    # 1. Update all codes in inventory_stock based on the menu_master names
    # This fixes the mismatch where 'कांदामसाला' had 'F_TANDUL' and 'तांदूळ' had None.
    # Note: We use a simple loop to be safe and handle Marathi names correctly.
    
    res = conn.execute(text("SELECT item_name, item_code FROM menu_master WHERE teacher_id = :tid"), {"tid": teacher_id})
    master_map = {r.item_name: r.item_code for r in res}
    
    for name, code in master_map.items():
        conn.execute(text("""
            UPDATE inventory_stock 
            SET item_code = :code 
            WHERE teacher_id = :tid AND item_name = :name
        """), {"code": code, "tid": teacher_id, "name": name})
        print(f"Updated {name} -> {code}")

    # 2. Address the 500kg swap.
    # The user said they added 500kg of Tandul.
    # We saw 'कांदामसाला' has 499kg and 'F_TANDUL' code.
    # But now we just updated 'कांदामसाला' to 'F_KANDAMASALA' code.
    # So now 'कांदामसाला' has 499kg and 'तांदूळ' has -3.4kg.
    # WE MUST SWAP THE BALANCES!
    
    print("\n--- Swapping Balances for Tandul and Kandamasala ---")
    res_k = conn.execute(text("SELECT current_balance FROM inventory_stock WHERE teacher_id = :tid AND item_name = 'कांदामसाला'"), {"tid": teacher_id}).fetchone()
    res_t = conn.execute(text("SELECT current_balance FROM inventory_stock WHERE teacher_id = :tid AND item_name = 'तांदूळ'"), {"tid": teacher_id}).fetchone()
    
    if res_k and res_t:
        bal_k = res_k[0]
        bal_t = res_t[0]
        print(f"Current Balances: Tandul={bal_t}, Kandamasala={bal_k}")
        
        # Swap them
        conn.execute(text("UPDATE inventory_stock SET current_balance = :b WHERE teacher_id = :tid AND item_name = 'तांदूळ'"), {"b": bal_k, "tid": teacher_id})
        conn.execute(text("UPDATE inventory_stock SET current_balance = :b WHERE teacher_id = :tid AND item_name = 'कांदामसाला'"), {"b": bal_t, "tid": teacher_id})
        print("Balances swapped successfully.")

    conn.commit()
    print("\n--- Success ---")
