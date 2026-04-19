import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))
from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    res = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'id'")).fetchone()
    print(res)
