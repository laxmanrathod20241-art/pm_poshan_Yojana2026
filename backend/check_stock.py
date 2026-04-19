from database import SessionLocal
import models

db = SessionLocal()
try:
    stocks = db.query(models.InventoryStock).all()
    print(f"Total inventory stock rows: {len(stocks)}")
    for s in stocks:
        print(f"Teacher: {s.teacher_id}, Item: {s.item_name}, Balance: {s.current_balance}, Group: {s.standard_group}")
finally:
    db.close()
