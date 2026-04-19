
import psycopg2
conn = psycopg2.connect("postgresql://postgres:admin123@127.0.0.1:5434/postgres")
cur = conn.cursor()
cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='item_ledger_reports'")
for r in cur.fetchall():
    print(r)
cur.close()
conn.close()
