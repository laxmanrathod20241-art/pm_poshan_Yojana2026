
import sys
import io
from pathlib import Path
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

current_dir = Path(__file__).parent / "backend"
sys.path.append(str(current_dir))

from database import SessionLocal
import models

def check_sanvira_stock():
    db = SessionLocal()
    try:
        user = db.query(models.Profile).filter(models.Profile.email == 'sanvira09@gmail.com').first()
        if not user:
            print("User sanvira not found.")
            return
        
        print(f"User: {user.email} | ID: {user.id}")
        stocks = db.query(models.InventoryStock).filter(models.InventoryStock.teacher_id == str(user.id)).all()
        print(f"Found {len(stocks)} inventory records for sanvira.")
        for s in stocks:
            print(f" - {s.item_name}: {s.current_balance}")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_sanvira_stock()
