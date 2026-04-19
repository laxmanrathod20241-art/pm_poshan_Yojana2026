
import sys
import io
from pathlib import Path

# Force UTF-8 for stdout
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

current_dir = Path(__file__).parent / "backend"
sys.path.append(str(current_dir))

from database import SessionLocal
import models

def check_user_stock():
    db = SessionLocal()
    try:
        user = db.query(models.Profile).filter(models.Profile.email.like('%pratibhap154%')).first()
        if not user:
            print("User not found.")
            return
        
        print(f"User: {user.email} | ID: {user.id}")
        
        stocks = db.query(models.InventoryStock).filter(models.InventoryStock.teacher_id == str(user.id)).all()
        print(f"Found {len(stocks)} inventory records.")
        for s in stocks:
            print(f" - {s.item_name}: {s.current_balance} ({s.standard_group})")
            
        receipts = db.query(models.StockReceipt).filter(models.StockReceipt.teacher_id == str(user.id)).all()
        print(f"Found {len(receipts)} stock receipts.")
        for r in receipts:
            print(f" - {r.item_name}: {r.quantity_kg} on {r.receipt_date}")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_user_stock()
