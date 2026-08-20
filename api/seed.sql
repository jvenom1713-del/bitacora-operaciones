-- =============================================================================
-- SEED DATA DE PRUEBA: BITÁCORA DE OPERACIONES Y PERMISOS EN CALIENTE
-- =============================================================================

INSERT INTO control_version_permisos (id, version, ultima_actualizacion)
VALUES (1, 1, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

INSERT INTO permisos (codigo, recurso, accion, descripcion) VALUES
('bitacora:leer', 'bitacora', 'leer', 'Permite visualizar eventos de la bitácora'),
('bitacora:crear', 'bitacora', 'crear', 'Permite crear nuevos registros de eventos en la bitácora'),
('bitacora:editar', 'bitacora', 'editar', 'Permite modificar registros existentes de la bitácora'),
('bitacora:eliminar', 'bitacora', 'eliminar', 'Permite borrar registros de la bitácora'),
('turno:abrir', 'turno', 'abrir', 'Permite iniciar un nuevo turno operativo'),
('turno:cerrar', 'turno', 'cerrar', 'Permite realizar la entrega y cierre del turno'),
('instruccion:crear', 'instruccion', 'crear', 'Permite registrar instrucciones especiales para turnos'),
('permisos:administrar', 'permisos', 'administrar', 'Permite conceder/revocar permisos en caliente a usuarios')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO roles (codigo, nombre, descripcion) VALUES
('ADMIN', 'Administrador de Sistema', 'Acceso total y gestión de permisos en caliente'),
('JEFE_TURNO', 'Jefe de Turno', 'Supervisión de operaciones, apertura y cierre de turno'),
('OPERADOR_SALA', 'Operador Sala de Control', 'Registro contínuo de novedades en la bitácora')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r, permisos p WHERE r.codigo = 'ADMIN'
ON CONFLICT DO NOTHING;

INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r, permisos p 
WHERE r.codigo = 'JEFE_TURNO' AND p.codigo IN ('bitacora:leer', 'bitacora:crear', 'bitacora:editar', 'turno:abrir', 'turno:cerrar', 'instruccion:crear')
ON CONFLICT DO NOTHING;

INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r, permisos p 
WHERE r.codigo = 'OPERADOR_SALA' AND p.codigo IN ('bitacora:leer', 'bitacora:crear')
ON CONFLICT DO NOTHING;

INSERT INTO usuarios (email, nombre, password_hash, activo) VALUES
('admin@generadora.cl', 'Administrador Sistema', 'hash_admin_123', TRUE),
('jsanmartin@generadora.cl', 'Juan San Martín (Jefe de Turno)', 'hash_jdt_123', TRUE),
('pflores@generadora.cl', 'Pedro Flores (Operador Sala)', 'hash_op_123', TRUE),
('jalbornoz@generadora.cl', 'J. Albornoz (Operador Sala)', 'hash_1234', TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO usuario_roles (usuario_id, rol_id)
SELECT u.id, r.id FROM usuarios u, roles r WHERE u.email = 'admin@generadora.cl' AND r.codigo = 'ADMIN'
ON CONFLICT DO NOTHING;

INSERT INTO usuario_roles (usuario_id, rol_id)
SELECT u.id, r.id FROM usuarios u, roles r WHERE u.email = 'jsanmartin@generadora.cl' AND r.codigo = 'JEFE_TURNO'
ON CONFLICT DO NOTHING;

INSERT INTO usuario_roles (usuario_id, rol_id)
SELECT u.id, r.id FROM usuarios u, roles r WHERE u.email = 'pflores@generadora.cl' AND r.codigo = 'OPERADOR_SALA'
ON CONFLICT DO NOTHING;

INSERT INTO usuario_roles (usuario_id, rol_id)
SELECT u.id, r.id FROM usuarios u, roles r WHERE u.email = 'jalbornoz@generadora.cl' AND r.codigo = 'OPERADOR_SALA'
ON CONFLICT DO NOTHING;

INSERT INTO usuario_permisos_directos (usuario_id, permiso_id, concedido, otorgado_por)
SELECT u.id, p.id, TRUE, (SELECT id FROM usuarios WHERE email = 'admin@generadora.cl')
FROM usuarios u, permisos p 
WHERE u.email = 'pflores@generadora.cl' AND p.codigo = 'turno:cerrar'
ON CONFLICT (usuario_id, permiso_id) DO UPDATE SET concedido = TRUE, actualizado_en = CURRENT_TIMESTAMP;

INSERT INTO turnos (folio, tipo_turno, fecha, jefe_turno_id, operador_id, estado)
SELECT '01', 'DIURNO', DATE('now'), 
       (SELECT id FROM usuarios WHERE email = 'jsanmartin@generadora.cl'),
       (SELECT id FROM usuarios WHERE email = 'pflores@generadora.cl'),
       'ABIERTO'
WHERE NOT EXISTS (SELECT 1 FROM turnos WHERE estado = 'ABIERTO');

INSERT INTO resumen_generacion_diaria (
    fecha_turno, 
    sistema_prom_mw, 
    potencia_esperada_mw, 
    mw_fuegos_suplementarios, 
    hrs_carga_base, 
    hrs_minimo_tecnico, 
    hrs_fuegos_suplementarios, 
    costo_marginal_usd_mw
) VALUES (
    DATE('now'), 56.7, 4004, 0, 0, 22, 0, 52.9
)
ON CONFLICT (fecha_turno) DO NOTHING;
