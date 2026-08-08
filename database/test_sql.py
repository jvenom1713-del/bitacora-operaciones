import sqlite3
import os

db_path = "database/bitacora_test.db"
if os.path.exists(db_path):
    try:
        os.remove(db_path)
    except Exception:
        pass

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("1. Ejecutando schema.sql...")
with open("database/schema.sql", "r", encoding="utf-8") as f:
    schema_sql = f.read()

# Adaptaciones para SQLite en prueba local
schema_sql_sqlite = schema_sql.replace("SERIAL PRIMARY KEY", "INTEGER PRIMARY KEY AUTOINCREMENT")
schema_sql_sqlite = schema_sql_sqlite.replace("BIGINT", "INTEGER")
schema_sql_sqlite = schema_sql_sqlite.replace("CREATE OR REPLACE VIEW", "CREATE VIEW IF NOT EXISTS")


cursor.executescript(schema_sql_sqlite)
conn.commit()
print("   -> Esquema creado exitosamente.")

print("2. Ejecutando seed.sql...")
with open("database/seed.sql", "r", encoding="utf-8") as f:
    seed_sql = f.read()

# Adaptar cierres para SQLite
seed_sql_sqlite = seed_sql.replace("ON CONFLICT (id) DO NOTHING", "")
seed_sql_sqlite = seed_sql_sqlite.replace("ON CONFLICT (codigo) DO NOTHING", "")
seed_sql_sqlite = seed_sql_sqlite.replace("ON CONFLICT (email) DO NOTHING", "")
seed_sql_sqlite = seed_sql_sqlite.replace("ON CONFLICT (folio) DO NOTHING", "")
seed_sql_sqlite = seed_sql_sqlite.replace("ON CONFLICT (usuario_id, permiso_id) DO UPDATE SET concedido = TRUE, actualizado_en = CURRENT_TIMESTAMP", "ON CONFLICT (usuario_id, permiso_id) DO UPDATE SET concedido = TRUE")

cursor.executescript(seed_sql_sqlite)
conn.commit()
print("   -> Seed data insertado exitosamente.")

print("3. Probando vista v_usuario_permisos_efectivos para usuario 2 (Juan San Martín)...")
cursor.execute("SELECT permiso_codigo FROM v_usuario_permisos_efectivos WHERE usuario_id = 2")
permisos_usuario_2 = [row[0] for row in cursor.fetchall()]
print(f"   -> Permisos efectivos de Juan San Martín: {permisos_usuario_2}")

print("4. Probando vista v_usuario_permisos_efectivos para usuario 3 (Pedro Flores)...")
cursor.execute("SELECT permiso_codigo FROM v_usuario_permisos_efectivos WHERE usuario_id = 3")
permisos_usuario_3 = [row[0] for row in cursor.fetchall()]
print(f"   -> Permisos efectivos de Pedro Flores: {permisos_usuario_3}")

print("5. Probando consulta ETL de resumen_generacion_diaria...")
cursor.execute("SELECT fecha_turno, sistema_prom_mw, potencia_esperada_mw, mw_fuegos_suplementarios, hrs_carga_base, hrs_minimo_tecnico, hrs_fuegos_suplementarios, costo_marginal_usd_mw FROM resumen_generacion_diaria")
resumen = cursor.fetchall()
print(f"   -> Resumen diario generado (ETL): {resumen}")

print("6. Probando consulta programa_diario_sen (12 campos de Generación Diaria)...")
cursor.execute("""
SELECT 
    'Fuera de servicio' AS despacho_cnr, 
    ROUND(AVG(precio_tco), 1) AS sistema_prom, 
    ROUND(SUM(generacion_gn_a + generacion_gn_b), 0) AS pot_esperada_mw, 
    ROUND(SUM(generacion_gn_b), 0) AS mw_fuegos_suplemen, 
    SUM(CASE WHEN (generacion_gn_a + generacion_gn_b) >= 330 THEN 1 ELSE 0 END) AS hrs_carga_base, 
    SUM(CASE WHEN generacion_gn_a = 160 AND generacion_gn_b = 0 THEN 1 ELSE 0 END) AS hrs_min_tec,
    SUM(CASE WHEN generacion_gn_b > 32 THEN 1 ELSE 0 END) AS hrs_fuegos_suplem, 
    ROUND(SUM(consumo_gas) / 1000, 1) AS miles_m3_gas, 
    SUM(consumo_fa) AS m3_fa, 
    SUM(consumo_diesel) AS m3_diesel, 
    SUM(consumo_glp) AS kg_gas_glp, 
    ROUND(AVG(cmg_quillota), 1) AS costo_marginal
FROM programa_diario_sen
WHERE fecha = CURRENT_DATE 
GROUP BY fecha
""")
sen_resumen = cursor.fetchall()
print(f"   -> Resumen SEN 12 campos generado: {sen_resumen}")

print("7. Probando vista v_resumen_cierre_turno para el turno 1...")
cursor.execute("SELECT bloque, tipo_categoria, texto_anotacion, referencia_equipo_senal, estado_o_prioridad FROM v_resumen_cierre_turno WHERE turno_id = 1")
filas_resumen = cursor.fetchall()
for row in filas_resumen:
    print(f"   [PDF DATA] Bloque: {row[0]} | Tipo: {row[1]} | Ref: {row[3]} | Estado/Prioridad: {row[4]} | Texto: {row[2]}")

conn.close()
print("\n¡VALIDACIÓN SQL EXITOSA!")

