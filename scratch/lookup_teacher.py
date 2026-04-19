from sqlalchemy import create_engine, text
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

engine = create_engine("postgresql://postgres:admin123@127.0.0.1:5434/postgres")

with engine.connect() as conn:
    print("--- Teacher ID Lookup ---")
    res = conn.execute(text("""
        SELECT id, email 
        FROM profiles 
        WHERE email = 'pratibhap154@gmail.com'
    """))
    row = res.fetchone()
    if row:
        print(f"Email: {row.email}, ID: {row.id}")
    else:
        print("Teacher not found.")
