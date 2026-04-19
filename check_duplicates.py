
import sys
from pathlib import Path
current_dir = Path(__file__).parent / "backend"
sys.path.append(str(current_dir))

from database import SessionLocal
import models

def check_duplicates():
    db = SessionLocal()
    try:
        users = db.query(models.Profile).filter(models.Profile.email.like('%pratibha%')).all()
        print(f"Found {len(users)} users matching 'pratibha'.")
        for u in users:
            print(f" - {u.email} | ID: {u.id} | Role: {u.role}")
            
            stock_count = db.query(models.InventoryStock).filter(models.InventoryStock.teacher_id == str(u.id)).count()
            receipt_count = db.query(models.StockReceipt).filter(models.StockReceipt.teacher_id == str(u.id)).count()
            print(f"   Stocks: {stock_count} | Receipts: {receipt_count}")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_duplicates()
