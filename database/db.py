
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "calibtrack.db"
SCHEMA = Path(__file__).parent / "schema.sql"

def get_connection():
    con = sqlite3.connect(DB_PATH)
    con.execute("PRAGMA foreign_keys = ON")
    return con

def create_database():
    with get_connection() as con:
        con.executescript(SCHEMA.read_text())
    print("Database created successfully!")

if __name__ == "__main__":
    create_database()
