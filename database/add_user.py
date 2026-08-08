import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "bitacora.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("""
INSERT INTO usuarios (email, nombre, password_hash, activo) 
VALUES ('jalbornoz@generadora.cl', 'J. Albornoz (Operador Sala)', '1234', 1)
ON CONFLICT (email) DO NOTHING
""")

cursor.execute("""
INSERT INTO usuario_roles (usuario_id, rol_id)
SELECT u.id, r.id FROM usuarios u, roles r 
WHERE u.email = 'jalbornoz@generadora.cl' AND r.codigo = 'OPERADOR_SALA'
""")

conn.commit()
conn.close()
print("Usuario jalbornoz@generadora.cl agregado a bitacora.db")
