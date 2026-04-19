import sys
import os
from pathlib import Path

# Add backend to path so we can import database
sys.path.append(str(Path(__file__).parent))

def patch():
    print("Attempting to create payment_transactions table...")
    try:
        from sqlalchemy import text
        from database import engine
        
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS payment_transactions (
            id UUID PRIMARY KEY,
            user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
            school_name TEXT,
            amount INTEGER NOT NULL,
            razorpay_order_id TEXT UNIQUE NOT NULL,
            razorpay_payment_id TEXT,
            razorpay_signature TEXT,
            status TEXT NOT NULL DEFAULT 'CREATED',
            error_code TEXT,
            error_description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        """
        
        with engine.connect() as conn:
            conn.execute(text(create_table_sql))
            conn.commit()
            print("Successfully created payment_transactions table (PostgreSQL)")
            
    except Exception as e:
        print(f"Failed to patch database: {e}")

if __name__ == "__main__":
    patch()
