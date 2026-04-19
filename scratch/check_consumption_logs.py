from sqlalchemy import create_engine, text
engine = create_engine('postgresql://postgres:admin123@127.0.0.1:5434/postgres')
teacher_id = '91209c01-909a-4d3b-b62e-2323cc8df736'
with engine.connect() as conn:
    res = conn.execute(text("SELECT log_date, main_food, main_foods_all, ingredients_used FROM consumption_logs WHERE teacher_id = :tid ORDER BY log_date DESC LIMIT 10"), {"tid": teacher_id})
    for row in res:
        print(f"Date: {row.log_date}, Main: {ascii(row.main_food)}, All: {ascii(row.main_foods_all)}, Ingredients: {ascii(row.ingredients_used)}")
