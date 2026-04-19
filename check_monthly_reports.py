
import sys
import io
import json
from pathlib import Path
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

current_dir = Path(__file__).parent / "backend"
sys.path.append(str(current_dir))

from database import SessionLocal
import models

def check_monthly_reports():
    db = SessionLocal()
    try:
        user_id = '91209c01-909a-4d3b-b62e-2323cc8df736'
        reports = db.query(models.MonthlyReport).filter(models.MonthlyReport.teacher_id == user_id).all()
        print(f"Found {len(reports)} monthly reports.")
        for r in reports:
            print(f" - Month: {r.report_month}/{r.report_year}")
            print(f"   Data: {json.dumps(r.report_data, ensure_ascii=False)}")
    finally:
        db.close()

if __name__ == "__main__":
    check_monthly_reports()
