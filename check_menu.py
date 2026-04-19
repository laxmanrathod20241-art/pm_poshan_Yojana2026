
import sys
from pathlib import Path
current_dir = Path(__file__).parent / "backend"
sys.path.append(str(current_dir))

from database import SessionLocal
import models

def check_menu():
    db = SessionLocal()
    try:
        user_id = '91209c01-909a-4d3b-b62e-2323cc8df736'
        items = db.query(models.MenuMaster).filter(models.MenuMaster.teacher_id == user_id).all()
        print(f"Found {len(items)} menu items.")
        for i in items:
            print(f" - {i.item_name}")
    finally:
        db.close()

if __name__ == "__main__":
    check_menu()
