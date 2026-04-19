from sqlalchemy import create_engine, text
import sys
import json
import uuid

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

engine = create_engine("postgresql://postgres:admin123@127.0.0.1:5434/postgres")

teacher_id = "91209c01-909a-4d3b-b62e-2323cc8df736"

with engine.connect() as conn:
    print(f"--- Hard Resync for Teacher: {teacher_id} ---")
    
    # 0. Delete the specific problematic negative receipt
    print(" - Removing erroneous -114.2kg receipt...")
    conn.execute(text("DELETE FROM stock_receipts WHERE id = '3ff5f510-d59f-4b13-9624-a17f45a8b0df'"))
    
    # 1. Get all items in Menu Master
    res = conn.execute(text("SELECT item_name, item_code, grams_primary, grams_upper_primary FROM menu_master WHERE CAST(teacher_id AS TEXT) = :tid"), {"tid": teacher_id})
    items = res.fetchall()
    
    item_stats = {}
    for it in items:
        item_stats[it.item_name] = {
            "code": it.item_code,
            "grams_p": float(it.grams_primary or 0),
            "grams_u": float(it.grams_upper_primary or 0),
            "receipts": 0.0,
            "consumed": 0.0
        }
        
    # 2. Sum all receipts
    res = conn.execute(text("SELECT item_name, quantity_kg FROM stock_receipts WHERE CAST(teacher_id AS TEXT) = :tid"), {"tid": teacher_id})
    for r in res:
        if r.item_name in item_stats:
            item_stats[r.item_name]["receipts"] += float(r.quantity_kg)
        else:
            print(f"⚠️ Receipt found for unknown item: {r.item_name}")
            
    # 3. Sum all consumption
    res = conn.execute(text("SELECT meals_served_primary, meals_served_upper_primary, main_foods_all, ingredients_used FROM consumption_logs WHERE CAST(teacher_id AS TEXT) = :tid"), {"tid": teacher_id})
    for c in res:
        p_att = float(c.meals_served_primary or 0)
        u_att = float(c.meals_served_upper_primary or 0)
        
        used = set()
        if c.main_foods_all:
            used.update(c.main_foods_all)
        if c.ingredients_used:
            used.update(c.ingredients_used)
            
        for name in used:
            if name in item_stats:
                kg = (p_att * item_stats[name]["grams_p"] + u_att * item_stats[name]["grams_u"]) / 1000.0
                item_stats[name]["consumed"] += kg

    # 4. Update Inventory Stock
    print("\nCalculated Status:")
    for name, data in item_stats.items():
        true_balance = data["receipts"] - data["consumed"]
        print(f" - {name}: Receipts({data['receipts']}) - Consumed({data['consumed']:.3f}) = {true_balance:.3f}")
        
        # Update or Insert into inventory_stock
        check = conn.execute(text("SELECT id FROM inventory_stock WHERE CAST(teacher_id AS TEXT) = :tid AND item_name = :name"), {"tid": teacher_id, "name": name}).fetchone()
        if check:
            conn.execute(text("UPDATE inventory_stock SET current_balance = :bal WHERE id = :id"), {"bal": true_balance, "id": check.id})
        else:
            new_id = str(uuid.uuid4())
            conn.execute(text("INSERT INTO inventory_stock (id, teacher_id, item_name, item_code, current_balance, standard_group) VALUES (:id, :tid, :name, :code, :bal, 'primary')"), 
                         {"id": new_id, "tid": teacher_id, "name": name, "code": data["code"], "bal": true_balance})
            
    conn.commit()
    print("\n✅ Inventory Resynced Successfully!")
