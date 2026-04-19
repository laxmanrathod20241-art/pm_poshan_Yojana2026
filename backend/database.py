from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# 🔗 Connection string for Local PostgreSQL (Docker)
# Port 5433, Trust Mode (no password)
SQLALCHEMY_DATABASE_URL = "postgresql://postgres:admin123@127.0.0.1:5434/postgres"

# The 'engine' is the core of the connection
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# This will create a 'Session' whenever we need to talk to the DB
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# This is the base class that our data tables will inherit from
Base = declarative_base()

# Helper function to get a database connection
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()