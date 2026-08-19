import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "database", "bitacora.db")
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "..", "database", "schema.sql")
SEED_PATH = os.path.join(os.path.dirname(__file__), "..", "database", "seed.sql")

def get_actual_db_path():
    if os.environ.get("VERCEL"):
        tmp_db = "/tmp/bitacora.db"
        if not os.path.exists(tmp_db):
            for candidate in [DB_PATH, os.path.join(os.path.dirname(__file__), "bitacora.db"), os.path.join(os.getcwd(), "database", "bitacora.db")]:
                if os.path.exists(candidate):
                    try:
                        import shutil
                        shutil.copy2(candidate, tmp_db)
                        break
                    except Exception as e:
                        print(f"[Vercel DB Copy Error] {e}")
        return tmp_db if os.path.exists(tmp_db) else DB_PATH
    return DB_PATH

def get_db_connection():
    target_path = get_actual_db_path()
    conn = sqlite3.connect(target_path, timeout=30.0, isolation_level=None)
    try:
        conn.execute("PRAGMA journal_mode=WAL;")
    except Exception:
        pass
    conn.execute("PRAGMA busy_timeout=30000;")
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    db_dir = os.path.dirname(DB_PATH)
    if not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)

    db_exists = os.path.exists(DB_PATH)

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        if os.path.exists(SCHEMA_PATH):
            with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
                schema_sql = f.read()

            schema_sql_sqlite = schema_sql.replace("SERIAL PRIMARY KEY", "INTEGER PRIMARY KEY AUTOINCREMENT")
            schema_sql_sqlite = schema_sql_sqlite.replace("BIGINT", "INTEGER")
            schema_sql_sqlite = schema_sql_sqlite.replace("CREATE OR REPLACE VIEW", "CREATE VIEW IF NOT EXISTS")
            
            cursor.executescript(schema_sql_sqlite)
            cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_resumen_fecha_turno ON resumen_generacion_diaria(fecha_turno);")

        conn.commit()
    except Exception as e:
        print(f"[DB Init Warning] {e}")
        return

    conn.close()

if __name__ == "__main__":
    init_db()
