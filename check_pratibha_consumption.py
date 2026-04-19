
import sys
import io
from pathlib import Path
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

current_dir = Path(__file__).parent / "backend"
sys.path.append(str(current_dir))

from database import SessionLocal
import models

def check_consumption():
    db = SessionLocal()
    try:
        user_id = '91209c01-909a-4d3b-b62e-2323cc8df736'
        logs = db.query(models.ConsumptionLog).filter(models.ConsumptionLog.teacher_id == user_id).all()
        print(f"Found {len(logs)} consumption logs.")
        for l in logs:
            print(f" - Date: {l.log_date} | Primary: {l.meals_served_primary} | Ingredients: {l.ingredients_used}")
    finally:
        db.close()

if __name__ == "__main__":
    check_consumption()
