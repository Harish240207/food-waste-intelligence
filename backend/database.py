import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "database.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()

    # users (roles)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL
        )
    """)

    # foods
    conn.execute("""
        CREATE TABLE IF NOT EXISTS foods (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            price REAL NOT NULL DEFAULT 0,
            cost_price REAL NOT NULL DEFAULT 0
        )
    """)

    # billing
    conn.execute("""
        CREATE TABLE IF NOT EXISTS billing (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            food_name TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            total REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # alerts table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            severity TEXT NOT NULL DEFAULT 'info',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ✅ forecast history table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS forecast_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            forecast_date TEXT NOT NULL,
            generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            food_name TEXT NOT NULL,
            avg_last7_qty REAL NOT NULL,
            predicted_qty REAL NOT NULL,
            confidence INTEGER NOT NULL,
            suggestion TEXT NOT NULL,
            tag TEXT NOT NULL,
            history_points INTEGER NOT NULL
        )
    """)

    conn.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS uniq_forecast_per_day_item
        ON forecast_history(forecast_date, food_name)
    """)

    # ✅ NEW: EVENTS TABLE (Event-based features)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_date TEXT NOT NULL,
            event_type TEXT NOT NULL,
            title TEXT NOT NULL,
            impact REAL NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ✅ Prevent duplicates per date + event type
    conn.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS uniq_event_date_type
        ON events(event_date, event_type)
    """)

    # seed default users
    existing = conn.execute("SELECT COUNT(*) as c FROM users").fetchone()["c"]
    if existing == 0:
        conn.execute(
            "INSERT INTO users (username,password,role) VALUES (?,?,?)",
            ("admin", "admin123", "admin")
        )
        conn.execute(
            "INSERT INTO users (username,password,role) VALUES (?,?,?)",
            ("cashier", "cashier123", "cashier")
        )
        conn.execute(
            "INSERT INTO users (username,password,role) VALUES (?,?,?)",
            ("manager", "manager123", "manager")
        )

    conn.commit()
    conn.close()
