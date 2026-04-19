from sqlalchemy import create_engine, text

SQLALCHEMY_DATABASE_URL = "postgresql://postgres:admin123@127.0.0.1:5434/postgres"
engine = create_engine(SQLALCHEMY_DATABASE_URL)

def fix_payment_case_and_duplicates():
    email = 'salgaonjambharmalaschool@gmail.com'
    teacher_id = 'd2071d74-5e30-46f8-9f58-476267d6f05d'
    
    with engine.connect() as conn:
        # 1. Update profile to lowercase 'paid' and 'combo'
        update_profile = text("""
            UPDATE profiles 
            SET saas_payment_status = 'paid',
                saas_plan_type = 'combo'
            WHERE email = :email
        """)
        conn.execute(update_profile, {"email": email})
        
        # 2. Check subscriptions
        subs_query = text("SELECT id, created_at FROM saas_subscriptions WHERE teacher_id = :tid ORDER BY created_at DESC")
        subs = conn.execute(subs_query, {"tid": teacher_id}).fetchall()
        
        print(f"Found {len(subs)} subscription records for {email}")
        
        if len(subs) > 1:
            # Keep the newest one, delete others
            # Actually, looking at the screenshot, they both say 18 Apr 2026.
            # I'll delete all but one.
            ids_to_keep = subs[0][0]
            delete_query = text("DELETE FROM saas_subscriptions WHERE teacher_id = :tid AND id != :keep_id")
            conn.execute(delete_query, {"tid": teacher_id, "keep_id": ids_to_keep})
            print(f"Deleted duplicate subscription records. Kept ID: {ids_to_keep}")
        
        # 3. Update the remaining subscription record to lowercase 'paid'
        update_sub = text("UPDATE saas_subscriptions SET payment_status = 'paid', plan_type = 'combo' WHERE teacher_id = :tid")
        conn.execute(update_sub, {"tid": teacher_id})
        
        conn.commit()
        print("Finalized cleanup and case normalization.")

if __name__ == "__main__":
    fix_payment_case_and_duplicates()
