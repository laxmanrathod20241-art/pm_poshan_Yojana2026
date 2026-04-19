
import sys
from pathlib import Path
current_dir = Path(__file__).parent / "backend"
sys.path.append(str(current_dir))

from database import SessionLocal
import models

def check_all_receipts():
    db = SessionLocal()
    try:
        count = db.query(models.StockReceipt).count()
        print(f"Total receipts in DB: {count}")
        if count > 0:
            latest = db.query(models.StockReceipt).order_by(models.StockReceipt.created_at.desc()).limit(5).all()
            for r in latest:
                print(f" - {r.teacher_id}: {r.item_name} {r.quantity_kg} ({r.bill_no})")
    finally:
        db.close()

if __name__ == "__main__":
    check_all_receipts()
