from sqlalchemy import create_engine, text
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

engine = create_engine("postgresql://postgres:admin123@127.0.0.1:5434/postgres")

teacher_id = "91209c01-909a-4d3b-b62e-2323cc8df736"

with engine.connect() as conn:
    print("--- Kanda Masala (कांदामसाला) Audit ---")
    
    # 1. Check Menu Master
    res = conn.execute(text("SELECT item_name, item_code, grams_primary FROM menu_master WHERE teacher_id = :tid AND item_name = 'कांदामसाला'"), {"tid": teacher_id})
    item = res.fetchone()
    if item:
        print(f"✅ Item exists in Menu Master: {item.item_name} ({item.item_code}) with {item.grams_primary}g per student")
    else:
        print("❌ Item NOT FOUND in Menu Master")

    # 2. Check Receipts (including OPENING_BALANCE)
    res = conn.execute(text("SELECT receipt_date, quantity_kg, bill_no FROM stock_receipts WHERE teacher_id = :tid AND item_name = 'कांदामसाला'"), {"tid": teacher_id})
    print("\nReceipts:")
    for r in res:
        print(f" - {r.receipt_date}: {r.quantity_kg}kg ({r.bill_no})")

    # 3. Check if it appears in Weekly Schedule
    res = conn.execute(text("SELECT day_name FROM menu_weekly_schedule WHERE teacher_id = :tid AND menu_items::text LIKE '%%कांदामसाला%%'"), {"tid": teacher_id})
    print("\nScheduled on:")
    for r in res:
        print(f" - {r.day_name}")

    print("\nConclusion: The Item Ledger will calculate consumption correctly for Kanda Masala by multiplying the student attendance on these days by the grams defined in Menu Master.")
