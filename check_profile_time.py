
import sys
from pathlib import Path
current_dir = Path(__file__).parent / "backend"
sys.path.append(str(current_dir))

from database import SessionLocal
import models

def check_profile():
    db = SessionLocal()
    try:
        user = db.query(models.Profile).filter(models.Profile.email == 'pratibhap154@gmail.com').first()
        print(f"User Created At: {user.created_at}")
    finally:
        db.close()

if __name__ == "__main__":
    check_profile()
