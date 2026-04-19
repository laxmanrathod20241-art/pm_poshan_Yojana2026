from database import SessionLocal
import models
from datetime import date

db = SessionLocal()
try:
    logs = db.query(models.ConsumptionLog).filter(
        models.ConsumptionLog.log_date >= date(2026, 4, 1),
        models.ConsumptionLog.log_date <= date(2026, 4, 30)
    ).all()
    print(f"Found {len(logs)} consumption logs for April 2026")
    for log in logs:
        print(f"Date: {log.log_date}, Group: {log.standard_group}, Borrowed: {log.borrowed_items}")
finally:
    db.close()
