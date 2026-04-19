
import psycopg2
conn = psycopg2.connect("postgresql://postgres:admin123@127.0.0.1:5434/postgres")
cur = conn.cursor()
cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'stock_receipts'")
for c in cur.fetchall():
    print(c)
cur.close()
conn.close()
