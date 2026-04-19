
import sys
from pathlib import Path
current_dir = Path(__file__).parent / "backend"
sys.path.append(str(current_dir))

from database import engine
from sqlalchemy import inspect

inspector = inspect(engine)
for table in ['inventory_stock', 'stock_receipts']:
    columns = inspector.get_columns(table)
    print(f"Table: {table}")
    for c in columns:
        print(f" - {c['name']} ({c['type']})")
