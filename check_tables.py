
import sys
from pathlib import Path
current_dir = Path(__file__).parent / "backend"
sys.path.append(str(current_dir))

from database import engine
from sqlalchemy import inspect

inspector = inspect(engine)
tables = inspector.get_table_names()
print(f"Tables: {tables}")
