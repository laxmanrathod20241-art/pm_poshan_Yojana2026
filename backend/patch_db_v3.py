from database import engine
from sqlalchemy import text

def patch():
    print("Attempting SQLAlchemy direct patch...")
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE stock_receipts ADD COLUMN IF NOT EXISTS bill_no VARCHAR;"))
            conn.commit()
            print("Successfully added bill_no to stock_receipts")
    except Exception as e:
        print(f"SQLAlchemy patch error: {e}")

if __name__ == "__main__":
    patch()
