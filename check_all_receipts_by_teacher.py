
import sys
import io
from pathlib import Path
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

current_dir = Path(__file__).parent / "backend"
sys.path.append(str(current_dir))

from database import SessionLocal
import models

def check_all_receipts():
    db = SessionLocal()
    try:
        receipts = db.query(models.StockReceipt).all()
        print(f"Total receipts: {len(receipts)}")
        teacher_map = {}
        for r in receipts:
            teacher_map[r.teacher_id] = teacher_map.get(r.teacher_id, 0) + 1
            
        for tid, count in teacher_map.items():
            user = db.query(models.Profile).filter(models.Profile.id == tid).first()
            email = user.email if user else "Unknown"
            print(f"Teacher: {email} ({tid}) | Receipts: {count}")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_all_receipts()
