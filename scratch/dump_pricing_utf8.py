from sqlalchemy import create_engine, text
import sys

# Set encoding for output
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

SQLALCHEMY_DATABASE_URL = "postgresql://postgres:admin123@127.0.0.1:5434/postgres"
engine = create_engine(SQLALCHEMY_DATABASE_URL)

def dump_pricing():
    with engine.connect() as conn:
        rows = conn.execute(text("SELECT * FROM saas_pricing")).fetchall()
        for r in rows:
            print(dict(r._mapping))

if __name__ == "__main__":
    dump_pricing()
