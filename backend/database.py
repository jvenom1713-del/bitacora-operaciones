import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "database", "bitacora.db")
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "..", "database", "schema.sql")
SEED_PATH = os.path.join(os.path.dirname(__file__), "..", "database", "seed.sql")

def get_actual_db_path():
    if os.environ.get("VERCEL"):
        tmp_db = "/tmp/bitacora.db"
        if not os.path.exists(tmp_db) and os.path.exists(DB_PATH):
            try:
                import shutil
                shutil.copy2(DB_PATH, tmp_db)
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
    # Asegurar que el directorio database exista
    db_dir = os.path.dirname(DB_PATH)
    if not os.path.exists(db_dir):
        os.makedirs(db_dir)

    db_exists = os.path.exists(DB_PATH)

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
            schema_sql = f.read()

        # Adaptaciones SQLite
        schema_sql_sqlite = schema_sql.replace("SERIAL PRIMARY KEY", "INTEGER PRIMARY KEY AUTOINCREMENT")
        schema_sql_sqlite = schema_sql_sqlite.replace("BIGINT", "INTEGER")
        schema_sql_sqlite = schema_sql_sqlite.replace("CREATE OR REPLACE VIEW", "CREATE VIEW IF NOT EXISTS")

        
        cursor.executescript(schema_sql_sqlite)
        cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_resumen_fecha_turno ON resumen_generacion_diaria(fecha_turno);")

        # Migración automática si la tabla 'turnos' posee restricciones CHECK desactualizadas
        turnos_sql = cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='turnos'").fetchone()
        if turnos_sql and turnos_sql[0] and "CHECK" in turnos_sql[0]:
            print(">> Actualizando restricciones de la tabla turnos...")
            cursor.execute("PRAGMA foreign_keys=OFF;")
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS turnos_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    folio VARCHAR(50) UNIQUE NOT NULL,
                    tipo_turno VARCHAR(20) NOT NULL,
                    fecha DATE NOT NULL,
                    jefe_turno_id INT REFERENCES usuarios(id),
                    operador_id INT REFERENCES usuarios(id),
                    estado VARCHAR(20) NOT NULL DEFAULT 'ABIERTO',
                    fecha_apertura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    fecha_cierre TIMESTAMP
                );
            """)
            cursor.execute("INSERT INTO turnos_new (id, folio, tipo_turno, fecha, jefe_turno_id, operador_id, estado, fecha_apertura, fecha_cierre) SELECT id, folio, tipo_turno, fecha, jefe_turno_id, operador_id, estado, fecha_apertura, fecha_cierre FROM turnos;")
            cursor.execute("DROP TABLE turnos;")
            cursor.execute("ALTER TABLE turnos_new RENAME TO turnos;")
            cursor.execute("PRAGMA foreign_keys=ON;")

        # Formatear folios existentes a 2 dígitos correlativos si tienen formato antiguo
        cursor.execute("UPDATE turnos SET folio = printf('%02d', id) WHERE folio NOT GLOB '[0-9][0-9]';")

        conn.commit()
    except Exception as e:
        print(f"[DB Init Warning] {e}")
        return

    if not db_exists or os.path.getsize(DB_PATH) == 0:
        print(">> Insertando datos iniciales (seed)...")
        with open(SEED_PATH, "r", encoding="utf-8") as f:
            seed_sql = f.read()

        seed_sql_sqlite = seed_sql.replace("ON CONFLICT (id) DO NOTHING", "")
        seed_sql_sqlite = seed_sql_sqlite.replace("ON CONFLICT (codigo) DO NOTHING", "")
        seed_sql_sqlite = seed_sql_sqlite.replace("ON CONFLICT (email) DO NOTHING", "")
        seed_sql_sqlite = seed_sql_sqlite.replace("ON CONFLICT (folio) DO NOTHING", "")
        seed_sql_sqlite = seed_sql_sqlite.replace(
            "ON CONFLICT (usuario_id, permiso_id) DO UPDATE SET concedido = TRUE, actualizado_en = CURRENT_TIMESTAMP", 
            "ON CONFLICT (usuario_id, permiso_id) DO UPDATE SET concedido = TRUE"
        )

        cursor.executescript(seed_sql_sqlite)
        conn.commit()
        print(">> Base de Datos SQL inicializada correctamente.")

    conn.close()

if __name__ == "__main__":
    init_db()
