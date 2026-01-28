import sqlite3
import os

# ✅ SAME db file that database.py uses
DB_PATH = os.path.join(os.path.dirname(__file__), "database.db")

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# ✅ Ensure foods table exists
cur.execute("""
    CREATE TABLE IF NOT EXISTS foods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        price REAL NOT NULL DEFAULT 0
    )
""")
conn.commit()

# ✅ Add column if missing
try:
    cur.execute("ALTER TABLE foods ADD COLUMN cost_price REAL DEFAULT 0")
    conn.commit()
    print("✅ cost_price column added successfully!")
except Exception as e:
    print("⚠️ cost_price already exists or migration not needed:", e)

conn.close()
