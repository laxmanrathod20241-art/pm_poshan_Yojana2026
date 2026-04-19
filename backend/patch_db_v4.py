import sqlite3
import os
import sys
from pathlib import Path

# Add backend to path so we can import database
sys.path.append(str(Path(__file__).parent))

# This script adds the sort_rank column to menu_master table for existing databases
# It handles both SQLite (testing) and PostgreSQL (production) via raw SQL

def patch():
    # Detect DB Type from environment or local existence
    db_path = "pmpy_local.db"
    
    if os.path.exists(db_path):
        print(f"Detected SQLite database at {db_path}")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        try:
            cursor.execute("ALTER TABLE menu_master ADD COLUMN sort_rank INTEGER DEFAULT 999")
            conn.commit()
            print("Successfully added sort_rank to menu_master (SQLite)")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                print("Column sort_rank already exists (SQLite)")
            else:
                print(f"Error patching SQLite: {e}")
        finally:
            conn.close()
    else:
        # Try PostgreSQL if sqlite doesn't exist (assuming production)
        print("SQLite not found. Attempting PostgreSQL patch...")
        try:
            from sqlalchemy import create_engine, text
            from database import engine # Assuming engine is already configured
            
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE menu_master ADD COLUMN IF NOT EXISTS sort_rank INTEGER DEFAULT 999"))
                conn.commit()
                print("Successfully added sort_rank to menu_master (PostgreSQL)")
        except Exception as e:
            print(f"Failed to patch PostgreSQL: {e}")

if __name__ == "__main__":
    patch()
