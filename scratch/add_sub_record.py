from sqlalchemy import create_engine, text
from datetime import datetime, timedelta

SQLALCHEMY_DATABASE_URL = "postgresql://postgres:admin123@127.0.0.1:5434/postgres"
engine = create_engine(SQLALCHEMY_DATABASE_URL)

def add_subscription_record():
    email = 'salgaonjambharmalaschool@gmail.com'
    teacher_id = 'd2071d74-5e30-46f8-9f58-476267d6f05d'
    
    with engine.connect() as conn:
        # Insert into saas_subscriptions
        insert_query = text("""
            INSERT INTO saas_subscriptions (teacher_id, plan_type, amount_paid, payment_status, created_at)
            VALUES (:teacher_id, 'COMBO', 1199, 'PAID', :created_at)
        """)
        
        conn.execute(insert_query, {
            "teacher_id": teacher_id,
            "created_at": datetime.now()
        })
        conn.commit()
        print(f"Added subscription history record for {email}")

if __name__ == "__main__":
    add_subscription_record()
