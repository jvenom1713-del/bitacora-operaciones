import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "database", "bitacora.db")
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "database", "schema.sql")
SEED_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "database", "seed.sql")

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
    return conn

def init_db():
    target_path = get_actual_db_path()
    db_dir = os.path.dirname(target_path)
    if db_dir and not os.path.exists(db_dir):
        try:
            os.makedirs(db_dir, exist_ok=True)
        except Exception as e:
            print(f"[Init DB Dir Warning] {e}")

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        schema_candidates = [
            SCHEMA_PATH,
            os.path.join(os.path.dirname(__file__), "schema.sql"),
            os.path.join(os.getcwd(), "database", "schema.sql")
        ]
        
        found_schema = None
        for cand in schema_candidates:
            if os.path.exists(cand):
                found_schema = cand
                break

        if found_schema:
            with open(found_schema, "r", encoding="utf-8") as f:
                schema_sql = f.read()

            schema_sql_sqlite = schema_sql.replace("SERIAL PRIMARY KEY", "INTEGER PRIMARY KEY AUTOINCREMENT")
            schema_sql_sqlite = schema_sql_sqlite.replace("BIGINT", "INTEGER")
            schema_sql_sqlite = schema_sql_sqlite.replace("CREATE OR REPLACE VIEW", "CREATE VIEW IF NOT EXISTS")
            
            cursor.executescript(schema_sql_sqlite)
            try:
                cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_resumen_fecha_turno ON resumen_generacion_diaria(fecha_turno);")
            except Exception:
                pass

        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[DB Init Warning] {e}")

if __name__ == "__main__":
    init_db()
