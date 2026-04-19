
import sys
import io
from pathlib import Path
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

current_dir = Path(__file__).parent / "backend"
sys.path.append(str(current_dir))

from database import SessionLocal
import models

def check_timestamps():
    db = SessionLocal()
    try:
        user_id = '91209c01-909a-4d3b-b62e-2323cc8df736'
        stocks = db.query(models.InventoryStock).filter(models.InventoryStock.teacher_id == user_id).all()
        for s in stocks:
            print(f"Item: {s.item_name} | Balance: {s.current_balance} | Created: {s.created_at}")
    finally:
        db.close()

if __name__ == "__main__":
    check_timestamps()
