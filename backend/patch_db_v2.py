import sqlite3
import psycopg2
from database import engine

def patch_db():
    print("Patching database schema...")
    try:
        # Check if it's Postgres
        if 'postgresql' in str(engine.url):
            conn = psycopg2.connect(str(engine.url))
            cur = conn.cursor()
            try:
                cur.execute("ALTER TABLE stock_receipts ADD COLUMN IF NOT EXISTS bill_no VARCHAR;")
                print("Added bill_no to stock_receipts (Postgres)")
            except Exception as e:
                print(f"Postgres patch error (bill_no): {e}")
            conn.commit()
            cur.close()
            conn.close()
        else:
            # Assume SQLite
            import sqlite3
            db_path = str(engine.url).replace('sqlite:///', '')
            conn = sqlite3.connect(db_path)
            cur = conn.cursor()
            try:
                cur.execute("ALTER TABLE stock_receipts ADD COLUMN bill_no TEXT;")
                print("Added bill_no to stock_receipts (SQLite)")
            except Exception as e:
                print(f"SQLite patch error (bill_no): {e}")
            conn.commit()
            conn.close()
    except Exception as e:
        print(f"General patch error: {e}")

if __name__ == "__main__":
    patch_db()
