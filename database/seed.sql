-- =============================================================================
-- SEED DATA DE PRUEBA: BITÁCORA DE OPERACIONES Y PERMISOS EN CALIENTE
-- =============================================================================

-- 1. Inicializar Versión de Permisos
INSERT INTO control_version_permisos (id, version, ultima_actualizacion)
VALUES (1, 1, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- 2. Insertar Catálogo de Permisos
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

-- 3. Insertar Roles del Sistema
INSERT INTO roles (codigo, nombre, descripcion) VALUES
('ADMIN', 'Administrador de Sistema', 'Acceso total y gestión de permisos en caliente'),
('JEFE_TURNO', 'Jefe de Turno', 'Supervisión de operaciones, apertura y cierre de turno'),
('OPERADOR_SALA', 'Operador Sala de Control', 'Registro contínuo de novedades en la bitácora')
ON CONFLICT (codigo) DO NOTHING;

-- 4. Asignar Permisos a Roles (rol_permisos)
-- ADMIN: Todos los permisos
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r, permisos p WHERE r.codigo = 'ADMIN'
ON CONFLICT DO NOTHING;

-- JEFE_TURNO: Ver, crear, editar bitácora, abrir/cerrar turno, crear instrucciones
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r, permisos p 
WHERE r.codigo = 'JEFE_TURNO' AND p.codigo IN ('bitacora:leer', 'bitacora:crear', 'bitacora:editar', 'turno:abrir', 'turno:cerrar', 'instruccion:crear')
ON CONFLICT DO NOTHING;

-- OPERADOR_SALA: Ver y crear eventos de bitácora
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r, permisos p 
WHERE r.codigo = 'OPERADOR_SALA' AND p.codigo IN ('bitacora:leer', 'bitacora:crear')
ON CONFLICT DO NOTHING;

-- 5. Insertar Usuarios de Prueba
INSERT INTO usuarios (email, nombre, password_hash, activo) VALUES
('admin@generadora.cl', 'Administrador Sistema', 'hash_admin_123', TRUE),
('jsanmartin@generadora.cl', 'Juan San Martín (Jefe de Turno)', 'hash_jdt_123', TRUE),
('pflores@generadora.cl', 'Pedro Flores (Operador Sala)', 'hash_op_123', TRUE),
('jalbornoz@generadora.cl', 'J. Albornoz (Operador Sala)', 'hash_1234', TRUE)
ON CONFLICT (email) DO NOTHING;

-- 6. Asignar Roles a Usuarios
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

-- 7. Ejemplo de Permiso Directo "En Caliente" (Ej: Otorgar permiso de cerrar turno al Operador Pedro Flores de forma excepcional)
INSERT INTO usuario_permisos_directos (usuario_id, permiso_id, concedido, otorgado_por)
SELECT u.id, p.id, TRUE, (SELECT id FROM usuarios WHERE email = 'admin@generadora.cl')
FROM usuarios u, permisos p 
WHERE u.email = 'pflores@generadora.cl' AND p.codigo = 'turno:cerrar'
ON CONFLICT (usuario_id, permiso_id) DO UPDATE SET concedido = TRUE, actualizado_en = CURRENT_TIMESTAMP;

-- 8. Insertar Turno Inicial de Ejemplo
INSERT INTO turnos (folio, tipo_turno, fecha, jefe_turno_id, operador_id, estado)
SELECT 'TURNO-20260729-M', 'MAÑANA', CURRENT_DATE, 
       (SELECT id FROM usuarios WHERE email = 'jsanmartin@generadora.cl'),
       (SELECT id FROM usuarios WHERE email = 'pflores@generadora.cl'),
       'ABIERTO'
ON CONFLICT (folio) DO NOTHING;

-- 9. Insertar Eventos Iniciales en la Bitácora
INSERT INTO eventos_bitacora (turno_id, usuario_id, categoria, prioridad, titulo, descripcion, equipo_afectado)
VALUES 
((SELECT id FROM turnos WHERE folio = 'TURNO-20260729-M'), (SELECT id FROM usuarios WHERE email = 'jsanmartin@generadora.cl'), 'OPERATIVO', 'MEDIA', 'Asunción de Turno Mañana', 'Se asume el turno en condiciones normales de operación con central Nueva Renca en línea.', 'Central Nueva Renca'),
((SELECT id FROM turnos WHERE folio = 'TURNO-20260729-M'), (SELECT id FROM usuarios WHERE email = 'pflores@generadora.cl'), 'INSTRUCCION_CEN', 'ALTA', 'Despacho CEN Generación', 'Coordinador Eléctrico Nacional solicita incrementar carga a 330 MW.', 'GT-1 Nueva Renca');

-- 10. Insertar Instrucción Especial Inicial
INSERT INTO instrucciones_especiales (turno_origen_id, instruccion, estado, creado_por)
VALUES 
((SELECT id FROM turnos WHERE folio = 'TURNO-20260729-M'), 'Mantener monitoreo continuo en temperatura de cojinetes de turbina de gas GT-1.', 'VIGENTE', (SELECT id FROM usuarios WHERE email = 'jsanmartin@generadora.cl'));

-- 11. Insertar Lecturas Horarias de Ejemplo para el Turno 'Día - TIGRES'
INSERT INTO bitacora_lecturas_horarias (fecha_registro, hora, turno, precio_tco, generacion_gas, generacion_fuego, generacion_total, costo_marginal_qta) VALUES
(CURRENT_DATE, 1, 'Día - TIGRES', 12500.0, 297.0, 35.0, 332.0, 58.4),
(CURRENT_DATE, 2, 'Día - TIGRES', 12500.0, 297.0, 35.0, 332.0, 58.4),
(CURRENT_DATE, 3, 'Día - TIGRES', 12500.0, 297.0, 35.0, 332.0, 58.4),
(CURRENT_DATE, 4, 'Día - TIGRES', 12500.0, 297.0, 35.0, 332.0, 58.4),
(CURRENT_DATE, 5, 'Día - TIGRES', 12500.0, 297.0, 35.0, 332.0, 58.4),
(CURRENT_DATE, 6, 'Día - TIGRES', 12500.0, 297.0, 35.0, 332.0, 58.4),
(CURRENT_DATE, 7, 'Día - TIGRES', 12500.0, 297.0, 35.0, 332.0, 58.4),
(CURRENT_DATE, 8, 'Día - TIGRES', 12500.0, 297.0, 35.0, 332.0, 58.4),
(CURRENT_DATE, 9, 'Día - TIGRES', 12500.0, 297.0, 35.0, 332.0, 58.4),
(CURRENT_DATE, 10, 'Día - TIGRES', 12500.0, 297.0, 35.0, 332.0, 58.4),
(CURRENT_DATE, 11, 'Día - TIGRES', 12500.0, 297.0, 35.0, 332.0, 58.4),
(CURRENT_DATE, 12, 'Día - TIGRES', 12500.0, 297.0, 35.0, 332.0, 58.4);

-- 12. Generar el primer Resumen de Generación Diaria mediante el proceso ETL
INSERT INTO resumen_generacion_diaria (
    fecha_turno, 
    sistema_prom_mw, 
    potencia_esperada_mw, 
    mw_fuegos_suplementarios, 
    hrs_carga_base, 
    hrs_minimo_tecnico, 
    hrs_fuegos_suplementarios, 
    costo_marginal_usd_mw
)
SELECT 
    fecha_registro,
    ROUND(AVG(precio_tco), 1),
    ROUND(SUM(generacion_gas) + SUM(generacion_fuego), 0),
    ROUND(SUM(generacion_fuego), 0),
    SUM(CASE WHEN generacion_total >= 330 THEN 1 ELSE 0 END),
    SUM(CASE WHEN generacion_total = 160 THEN 1 ELSE 0 END),
    SUM(CASE WHEN generacion_fuego > 32 THEN 1 ELSE 0 END),
    ROUND(AVG(costo_marginal_qta), 1)
FROM 
    bitacora_lecturas_horarias
WHERE 
    fecha_registro = CURRENT_DATE 
    AND turno = 'Día - TIGRES'
GROUP BY 
    fecha_registro;

-- 13. Insertar Lecturas del Programa Diario SEN de Ejemplo
INSERT INTO programa_diario_sen (fecha, hora, precio_tco, generacion_gn_a, generacion_gn_b, consumo_gas, consumo_fa, consumo_diesel, consumo_glp, cmg_quillota) VALUES
(CURRENT_DATE, 1, 12500.0, 165.0, 35.0, 2500.0, 0.0, 0.0, 0.0, 58.4),
(CURRENT_DATE, 2, 12500.0, 165.0, 35.0, 2500.0, 0.0, 0.0, 0.0, 58.4),
(CURRENT_DATE, 3, 12500.0, 165.0, 35.0, 2500.0, 0.0, 0.0, 0.0, 58.4),
(CURRENT_DATE, 4, 12500.0, 165.0, 35.0, 2500.0, 0.0, 0.0, 0.0, 58.4),
(CURRENT_DATE, 5, 12500.0, 165.0, 35.0, 2500.0, 0.0, 0.0, 0.0, 58.4),
(CURRENT_DATE, 6, 12500.0, 165.0, 35.0, 2500.0, 0.0, 0.0, 0.0, 58.4),
(CURRENT_DATE, 7, 12500.0, 165.0, 35.0, 2500.0, 0.0, 0.0, 0.0, 58.4),
(CURRENT_DATE, 8, 12500.0, 165.0, 35.0, 2500.0, 0.0, 0.0, 0.0, 58.4),
(CURRENT_DATE, 9, 12500.0, 165.0, 35.0, 2500.0, 0.0, 0.0, 0.0, 58.4),
(CURRENT_DATE, 10, 12500.0, 165.0, 35.0, 2500.0, 0.0, 0.0, 0.0, 58.4),
(CURRENT_DATE, 11, 12500.0, 165.0, 35.0, 2500.0, 0.0, 0.0, 0.0, 58.4),
(CURRENT_DATE, 12, 12500.0, 165.0, 35.0, 2500.0, 0.0, 0.0, 0.0, 58.4);

-- 14. Insertar Estado de Equipos (En Observación / Falla / Mantención) para Resumen PDF
INSERT INTO equipos_estado_registro (turno_id, codigo_equipo, nombre_equipo, estado, observacion) VALUES
((SELECT id FROM turnos WHERE folio = 'TURNO-20260729-M'), 'B-101A', 'Bomba de Agua de Alimentación A', 'En Observación', 'Seguimiento de tendencia de temperatura en cojinete RTD-3 (> 85°C)'),
((SELECT id FROM turnos WHERE folio = 'TURNO-20260729-M'), 'COMP-02', 'Compresor de Aire de Servicio 2', 'Falla', 'Disparo por alta presión de descarga. Personal de mantenimiento notificado.'),
((SELECT id FROM turnos WHERE folio = 'TURNO-20260729-M'), 'VALV-GAS-01', 'Válvula Reguladora de Gas GN-A', 'Mantención', 'Mantenimiento programado de actuador electro-neumático');

-- 15. Insertar Señales Forzadas / Intervenidas para Resumen PDF
INSERT INTO senales_forzadas (turno_id, codigo_senal, nombre_senal, estado_senal, motivo, usuario_id) VALUES
((SELECT id FROM turnos WHERE folio = 'TURNO-20260729-M'), 'L86TFOT', 'Lockout Falla Transformador Principal', 'FORZADA', 'Forzado preventivo por pruebas periódicas en rele 86T', (SELECT id FROM usuarios WHERE email = 'jsanmartin@generadora.cl')),
((SELECT id FROM turnos WHERE folio = 'TURNO-20260729-M'), 'L30SPT', 'Permisivo de Sobrepresión Turbina', 'PROBADA', 'Verificación funcional de trip durante secuencia de arranque', (SELECT id FROM usuarios WHERE email = 'pflores@generadora.cl'));

