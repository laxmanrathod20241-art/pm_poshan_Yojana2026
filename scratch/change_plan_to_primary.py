from sqlalchemy import create_engine, text

SQLALCHEMY_DATABASE_URL = "postgresql://postgres:admin123@127.0.0.1:5434/postgres"
engine = create_engine(SQLALCHEMY_DATABASE_URL)

def change_to_primary_plan():
    email = 'salgaonjambharmalaschool@gmail.com'
    teacher_id = 'd2071d74-5e30-46f8-9f58-476267d6f05d'
    
    with engine.connect() as conn:
        # 1. Get pricing for 'primary'
        price_query = text("SELECT price FROM saas_pricing WHERE plan_type = 'primary'")
        price_row = conn.execute(price_query).fetchone()
        price = price_row[0] if price_row else 800
        print(f"Detected price for 'primary' plan: {price}")

        # 2. Update profile
        update_profile = text("""
            UPDATE profiles 
            SET saas_plan_type = 'primary',
                saas_amount_paid = :price
            WHERE email = :email
        """)
        conn.execute(update_profile, {"email": email, "price": price})
        
        # 3. Update subscription history
        update_sub = text("""
            UPDATE saas_subscriptions 
            SET plan_type = 'primary',
                amount_paid = :price
            WHERE teacher_id = :tid
        """)
        conn.execute(update_sub, {"tid": teacher_id, "price": price})
        
        conn.commit()
        print(f"Successfully changed {email} to 'primary' plan (1-5th).")

if __name__ == "__main__":
    change_to_primary_plan()
