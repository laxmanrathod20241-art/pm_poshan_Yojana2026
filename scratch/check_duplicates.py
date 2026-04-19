from sqlalchemy import create_engine, text

SQLALCHEMY_DATABASE_URL = "postgresql://postgres:admin123@127.0.0.1:5434/postgres"
engine = create_engine(SQLALCHEMY_DATABASE_URL)

with engine.connect() as conn:
    # 1. Find User
    result = conn.execute(text("SELECT id FROM profiles WHERE email LIKE '%pratibhap154%'"))
    user = result.fetchone()
    if user:
        user_id = user[0]
        print(f"User ID: {user_id}")
        
        # 2. Check for duplicate daily_logs in April 2026
        query = text("""
            SELECT log_date, COUNT(*) 
            FROM daily_logs 
            WHERE CAST(teacher_id AS TEXT) = :tid 
            AND log_date >= '2026-04-01' AND log_date <= '2026-04-30'
            GROUP BY log_date
            HAVING COUNT(*) > 1
        """)
        result = conn.execute(query, {"tid": str(user_id)})
        duplicates = result.fetchall()
        if duplicates:
            print("\nDuplicate Daily Logs found:")
            for d in duplicates:
                print(f"Date: {d[0]}, Count: {d[1]}")
        else:
            print("\nNo duplicate daily logs found for April.")
            
        # 3. Check for duplicate consumption_logs in April 2026
        query = text("""
            SELECT log_date, COUNT(*) 
            FROM consumption_logs 
            WHERE CAST(teacher_id AS TEXT) = :tid 
            AND log_date >= '2026-04-01' AND log_date <= '2026-04-30'
            GROUP BY log_date
            HAVING COUNT(*) > 1
        """)
        result = conn.execute(query, {"tid": str(user_id)})
        duplicates = result.fetchall()
        if duplicates:
            print("\nDuplicate Consumption Logs found:")
            for d in duplicates:
                print(f"Date: {d[0]}, Count: {d[1]}")
        else:
            print("\nNo duplicate consumption logs found for April.")
            
        # 4. Check total meals for April
        query = text("""
            SELECT SUM(meals_served_primary), SUM(meals_served_upper_primary)
            FROM daily_logs
            WHERE CAST(teacher_id AS TEXT) = :tid
            AND log_date >= '2026-04-01' AND log_date <= '2026-04-30'
        """)
        meals = conn.execute(query, {"tid": str(user_id)}).fetchone()
        print(f"\nTotal Meals in April: Primary={meals[0]}, Upper={meals[1]}")

    else:
        print("User not found.")
