from sqlalchemy import create_engine, text
from datetime import datetime, timedelta

SQLALCHEMY_DATABASE_URL = "postgresql://postgres:admin123@127.0.0.1:5434/postgres"
engine = create_engine(SQLALCHEMY_DATABASE_URL)

def update_payment():
    email = 'salgaonjambharmalaschool@gmail.com'
    with engine.connect() as conn:
        # 1. Fetch current data
        query = text("SELECT id, email, saas_plan_type, saas_payment_status FROM profiles WHERE email = :email")
        user = conn.execute(query, {"email": email}).fetchone()
        
        if not user:
            print(f"Error: User {email} not found.")
            return

        user_data = dict(user._mapping)
        print(f"Current Data: {user_data}")

        # 2. Update to paid for combo pack
        # Usually combo pack is 'COMBO' or 'PREMIUM'
        # Let's set saas_plan_type = 'COMBO' and saas_payment_status = 'PAID'
        # Also set expiry to 1 year from now
        expiry = datetime.now() + timedelta(days=365)
        
        update_query = text("""
            UPDATE profiles 
            SET saas_plan_type = 'COMBO',
                saas_payment_status = 'PAID',
                saas_amount_paid = 1199,
                saas_expiry_date = :expiry,
                is_onboarded = true
            WHERE email = :email
        """)
        
        result = conn.execute(update_query, {"email": email, "expiry": expiry})
        conn.commit()
        
        if result.rowcount > 0:
            print(f"Success: Updated {email} to PAID (COMBO). Expiry set to {expiry.date()}")
        else:
            print("Failed to update.")

if __name__ == "__main__":
    update_payment()
