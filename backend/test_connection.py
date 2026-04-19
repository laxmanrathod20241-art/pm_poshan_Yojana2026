from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 🔗 The Connection String
# format: postgresql://[user]:[password]@[host]:[port]/[db_name]
# We replaced the '@' in your password with '%40'
SQLALCHEMY_DATABASE_URL = "postgresql://postgres:Ayush%40202325@localhost:5432/postgres"

# Create the engine
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Create a session factory (this is what we'll use to run queries)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# This will be the base class for our database models later
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()