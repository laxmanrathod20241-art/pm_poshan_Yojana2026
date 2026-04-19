
import psycopg2
try:
    conn = psycopg2.connect("postgresql://postgres:Ayush@202325@localhost:5432/postgres")
    cur = conn.cursor()
    print("--- Connected to 5432 ---")
    teacher_id = '91209c01-909a-4d3b-b62e-2323cc8df736'
    cur.execute("SELECT id, item_name, quantity_kg, receipt_date, bill_no FROM stock_receipts WHERE teacher_id = %s AND item_name = 'तांदूळ'", (teacher_id,))
    for r in cur.fetchall():
        print(r)
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error 5432: {e}")
