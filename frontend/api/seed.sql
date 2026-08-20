-- =============================================================================
-- SEED DATA DE PRUEBA: BITÁCORA DE OPERACIONES Y PERMISOS EN CALIENTE (SQLITE)
-- =============================================================================

INSERT OR IGNORE INTO control_version_permisos (id, version, ultima_actualizacion)
VALUES (1, 1, CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO permisos (codigo, recurso, accion, descripcion) VALUES
('bitacora:leer', 'bitacora', 'leer', 'Permite visualizar eventos de la bitácora'),
('bitacora:crear', 'bitacora', 'crear', 'Permite crear nuevos registros de eventos en la bitácora'),
('bitacora:editar', 'bitacora', 'editar', 'Permite modificar registros existentes de la bitácora'),
('bitacora:eliminar', 'bitacora', 'eliminar', 'Permite borrar registros de la bitácora'),
('turno:abrir', 'turno', 'abrir', 'Permite iniciar un nuevo turno operativo'),
('turno:cerrar', 'turno', 'cerrar', 'Permite realizar la entrega y cierre del turno'),
('instruccion:crear', 'instruccion', 'crear', 'Permite registrar instrucciones especiales para turnos'),
('permisos:administrar', 'permisos', 'administrar', 'Permite conceder/revocar permisos en caliente a usuarios');

INSERT OR IGNORE INTO roles (codigo, nombre, descripcion) VALUES
('ADMIN', 'Administrador de Sistema', 'Acceso total y gestión de permisos en caliente'),
('JEFE_TURNO', 'Jefe de Turno', 'Supervisión de operaciones, apertura y cierre de turno'),
('OPERADOR_SALA', 'Operador Sala de Control', 'Registro contínuo de novedades en la bitácora');

INSERT OR IGNORE INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r, permisos p WHERE r.codigo = 'ADMIN';

INSERT OR IGNORE INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r, permisos p 
WHERE r.codigo = 'JEFE_TURNO' AND p.codigo IN ('bitacora:leer', 'bitacora:crear', 'bitacora:editar', 'turno:abrir', 'turno:cerrar', 'instruccion:crear');

INSERT OR IGNORE INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r, permisos p 
WHERE r.codigo = 'OPERADOR_SALA' AND p.codigo IN ('bitacora:leer', 'bitacora:crear');

INSERT OR IGNORE INTO usuarios (id, email, nombre, password_hash, activo) VALUES
(1, 'admin@generadora.cl', 'Administrador Sistema', 'hash_admin_123', TRUE),
(2, 'jsanmartin@generadora.cl', 'Juan San Martín (Jefe de Turno)', 'hash_jdt_123', TRUE),
(3, 'pflores@generadora.cl', 'Pedro Flores (Operador Sala)', 'hash_op_123', TRUE),
(4, 'jalbornoz@generadora.cl', 'J. Albornoz (Operador Sala)', 'hash_1234', TRUE);

INSERT OR IGNORE INTO usuario_roles (usuario_id, rol_id)
SELECT u.id, r.id FROM usuarios u, roles r WHERE u.email = 'admin@generadora.cl' AND r.codigo = 'ADMIN';

INSERT OR IGNORE INTO usuario_roles (usuario_id, rol_id)
SELECT u.id, r.id FROM usuarios u, roles r WHERE u.email = 'jsanmartin@generadora.cl' AND r.codigo = 'JEFE_TURNO';

INSERT OR IGNORE INTO usuario_roles (usuario_id, rol_id)
SELECT u.id, r.id FROM usuarios u, roles r WHERE u.email = 'pflores@generadora.cl' AND r.codigo = 'OPERADOR_SALA';

INSERT OR IGNORE INTO usuario_roles (usuario_id, rol_id)
SELECT u.id, r.id FROM usuarios u, roles r WHERE u.email = 'jalbornoz@generadora.cl' AND r.codigo = 'OPERADOR_SALA';

INSERT OR REPLACE INTO usuario_permisos_directos (usuario_id, permiso_id, concedido, otorgado_por)
SELECT u.id, p.id, TRUE, (SELECT id FROM usuarios WHERE email = 'admin@generadora.cl')
FROM usuarios u, permisos p 
WHERE u.email = 'pflores@generadora.cl' AND p.codigo = 'turno:cerrar';

INSERT OR IGNORE INTO turnos (id, folio, tipo_turno, fecha, jefe_turno_id, operador_id, estado)
VALUES (1, '01', 'DIURNO', DATE('now'), 2, 3, 'ABIERTO');

INSERT OR IGNORE INTO eventos_bitacora (turno_id, usuario_id, categoria, prioridad, titulo, descripcion, equipo_afectado)
VALUES (1, 2, 'OPERATIVO', 'MEDIA', 'Asunción de Turno Diurno', 'Se asume el turno en condiciones normales de operación con central Nueva Renca en línea.', 'Central Nueva Renca');

INSERT OR IGNORE INTO resumen_generacion_diaria (
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
);
