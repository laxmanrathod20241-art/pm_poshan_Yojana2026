import urllib.parse
from sqlalchemy import create_engine

# Using a simple password to test the handshake
raw_password = "admin123" 
safe_password = urllib.parse.quote_plus(raw_password)

# Using 127.0.0.1 instead of localhost (more stable on Windows)
# Change 5432 to 5433
url = f"postgresql://postgres:{safe_password}@127.0.0.1:5433/postgres"

print(f"--- Attempting to connect to: 127.0.0.1:5433 ---")

try:
    engine = create_engine(url)
    with engine.connect() as conn:
        print("✅ SUCCESS: Python is now talking to your Local Database!")
except Exception as e:
    print("❌ CONNECTION FAILED")
    print(f"Error details: {e}")