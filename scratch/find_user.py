
import os
import psycopg2

conn = psycopg2.connect("postgresql://postgres:admin123@127.0.0.1:5434/postgres")
cur = conn.cursor()

print("--- Profiles matching 'pratibha' ---")
cur.execute("SELECT id, email, school_name_mr FROM profiles WHERE email LIKE '%pratibha%' OR id::text LIKE '%pratibha%'")
for p in cur.fetchall():
    print(p[0], p[1])

cur.close()
conn.close()
