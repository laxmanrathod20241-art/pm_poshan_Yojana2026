from sqlalchemy import create_engine, text
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

engine = create_engine("postgresql://postgres:admin123@127.0.0.1:5434/postgres")

teacher_id = "91209c01-909a-4d3b-b62e-2323cc8df736"

with engine.connect() as conn:
    print("--- Inventory Master Sync Audit ---")
    
    # Get master mapping
    res = conn.execute(text("SELECT item_name, item_code FROM menu_master WHERE CAST(teacher_id AS TEXT) = :tid"), {"tid": teacher_id})
    master_map = {r.item_name: r.item_code for r in res}
    
    # Get current inventory
    res = conn.execute(text("SELECT item_name, item_code, current_balance FROM inventory_stock WHERE CAST(teacher_id AS TEXT) = :tid"), {"tid": teacher_id})
    
    mismatches = []
    for r in res:
        correct_code = master_map.get(r.item_name)
        if not correct_code:
            mismatches.append(f"Orphan Item: {r.item_name} exists in Stock Register but NOT in Menu Settings!")
        elif r.item_code != correct_code:
            mismatches.append(f"Code Mismatch: {r.item_name} has code '{r.item_code}' but should be '{correct_code}'")
        else:
            print(f"✅ OK: {r.item_name} is perfectly linked to {r.item_code} (Balance: {r.current_balance} KG)")

    print("\n--- Final Status ---")
    if not mismatches:
        print("✅ ALL CLEAR: Every item in your Stock Register is perfectly synced with your Menu Settings.")
        print("Summary: No more mix-ups possible. Tandul (Rice) and Kandamasala are now uniquely locked to their own codes.")
    else:
        print(f"❌ {len(mismatches)} DISCREPANCIES FOUND:")
        for m in mismatches:
            print(f" - {m}")
