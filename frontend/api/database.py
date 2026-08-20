import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "database", "bitacora.db")
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")
SEED_PATH = os.path.join(os.path.dirname(__file__), "seed.sql")

def get_actual_db_path():
    if os.environ.get("VERCEL"):
        tmp_db = "/tmp/bitacora.db"
        if not os.path.exists(tmp_db):
            copied = False
            candidates = [
                os.path.join(os.path.dirname(__file__), "bitacora.db"),
                os.path.join(os.path.dirname(__file__), "..", "..", "database", "bitacora.db"),
                os.path.join(os.getcwd(), "database", "bitacora.db"),
                os.path.join(os.getcwd(), "bitacora.db"),
                DB_PATH
            ]
            for candidate in candidates:
                if os.path.exists(candidate):
                    try:
                        import shutil
                        shutil.copy2(candidate, tmp_db)
                        copied = True
                        print(f"[Vercel DB] Base de datos copiada desde {candidate} a {tmp_db}")
                        break
                    except Exception as e:
                        print(f"[Vercel DB Copy Warning] {e}")
            if not copied:
                print("[Vercel DB] No se encontró base de datos previa, se creará /tmp/bitacora.db nueva.")
        return tmp_db
    return DB_PATH

def init_db():
    target_path = get_actual_db_path()
    db_dir = os.path.dirname(target_path)
    if db_dir and not os.path.exists(db_dir):
        try:
            os.makedirs(db_dir, exist_ok=True)
        except Exception as e:
            print(f"[Init DB Dir Warning] {e}")

    try:
        conn = sqlite3.connect(target_path, timeout=30.0, isolation_level=None)
        cursor = conn.cursor()

        schema_candidates = [
            SCHEMA_PATH,
            os.path.join(os.path.dirname(__file__), "schema.sql"),
            os.path.join(os.path.dirname(__file__), "..", "..", "database", "schema.sql"),
            os.path.join(os.getcwd(), "database", "schema.sql")
        ]
        for cand in schema_candidates:
            if os.path.exists(cand):
                try:
                    with open(cand, "r", encoding="utf-8") as f:
                        sql_content = f.read()
                    sql_content = sql_content.replace("SERIAL PRIMARY KEY", "INTEGER PRIMARY KEY AUTOINCREMENT")
                    sql_content = sql_content.replace("BIGINT", "INTEGER")
                    sql_content = sql_content.replace("CREATE OR REPLACE VIEW", "CREATE VIEW IF NOT EXISTS")
                    cursor.executescript(sql_content)
                    break
                except Exception as ex_schema:
                    print(f"[Schema Exec Warning] {ex_schema}")

        seed_candidates = [
            SEED_PATH,
            os.path.join(os.path.dirname(__file__), "seed.sql"),
            os.path.join(os.path.dirname(__file__), "..", "..", "database", "seed.sql"),
            os.path.join(os.getcwd(), "database", "seed.sql")
        ]
        for cand in seed_candidates:
            if os.path.exists(cand):
                try:
                    with open(cand, "r", encoding="utf-8") as f:
                        seed_sql = f.read()
                    cursor.executescript(seed_sql)
                    break
                except Exception as ex_seed:
                    print(f"[Seed Exec Warning] {ex_seed}")

        conn.commit()
        conn.close()
        print("[DB Init OK] Esquema y Semilla de datos inicializados correctamente.")
    except Exception as e:
        print(f"[DB Init Fatal Error] {e}")

def get_db_connection():
    target_path = get_actual_db_path()
    db_dir = os.path.dirname(target_path)
    if db_dir and not os.path.exists(db_dir):
        try:
            os.makedirs(db_dir, exist_ok=True)
        except Exception as e:
            print(f"[DB Connection Dir Warning] {e}")

    conn = sqlite3.connect(target_path, timeout=30.0, isolation_level=None)
    try:
        conn.execute("PRAGMA journal_mode=MEMORY;")
    except Exception:
        pass
    conn.execute("PRAGMA busy_timeout=30000;")
    conn.row_factory = sqlite3.Row

    try:
        cur = conn.cursor()
        t = cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='usuarios';").fetchone()
        if not t:
            conn.close()
            init_db()
            conn = sqlite3.connect(target_path, timeout=30.0, isolation_level=None)
            conn.row_factory = sqlite3.Row
    except Exception as e:
        print(f"[DB Auto-heal Warning] {e}")

    return conn

if __name__ == "__main__":
    init_db()
