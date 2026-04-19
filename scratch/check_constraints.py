from sqlalchemy import create_engine, text

SQLALCHEMY_DATABASE_URL = "postgresql://postgres:admin123@127.0.0.1:5434/postgres"
engine = create_engine(SQLALCHEMY_DATABASE_URL)

def check_constraints():
    with engine.connect() as conn:
        query = text("""
            SELECT conname, pg_get_constraintdef(c.oid) 
            FROM pg_constraint c 
            JOIN pg_namespace n ON n.oid = c.connamespace 
            WHERE n.nspname = 'public' 
            AND conrelid = 'inventory_stock'::regclass
        """)
        rows = conn.execute(query).fetchall()
        for r in rows:
            print(r)

if __name__ == "__main__":
    check_constraints()
