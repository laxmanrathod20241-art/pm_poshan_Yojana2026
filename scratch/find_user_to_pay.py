from sqlalchemy import create_engine, text, inspect
import json

SQLALCHEMY_DATABASE_URL = "postgresql://postgres:admin123@127.0.0.1:5434/postgres"
engine = create_engine(SQLALCHEMY_DATABASE_URL)

def find_user_and_schema():
    with engine.connect() as conn:
        # Find the user
        email = 'salgaonjambharmalaschool@gmail.com'
        user_query = text("SELECT * FROM teachers WHERE email = :email")
        user = conn.execute(user_query, {"email": email}).fetchone()
        
        if user:
            user_data = dict(user._mapping)
            print(f"User Found: {user_data['id']} | {user_data['email']}")
            print(f"Current Status: {user_data.get('subscription_status')}")
            print(f"Plan Type: {user_data.get('plan_type')}")
        else:
            print("User not found in 'teachers' table.")
            # Try profiles table just in case
            user_query = text("SELECT * FROM profiles WHERE email = :email")
            user = conn.execute(user_query, {"email": email}).fetchone()
            if user:
                user_data = dict(user._mapping)
                print(f"User Found in profiles: {user_data.get('id')} | {user_data.get('email')}")
            else:
                print("User not found in 'profiles' table either.")

        # Check column names in teachers table
        inspector = inspect(engine)
        columns = [c['name'] for c in inspector.get_columns('teachers')]
        print(f"\nColumns in 'teachers' table: {columns}")

if __name__ == "__main__":
    find_user_and_schema()
