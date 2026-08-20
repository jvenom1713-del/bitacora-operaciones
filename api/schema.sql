-- =============================================================================
-- ESQUEMA DE BASE DE DATOS SQL: BITÁCORA DE OPERACIONES Y PERMISOS EN CALIENTE
-- Compatible con PostgreSQL, MySQL 8+, y SQLite 3.30+
-- =============================================================================

-- -----------------------------------------------------------------------------
-- MÓDULO 1: CONTROL DE ACCESO Y PERMISOS "EN CALIENTE" (DYNAMIC RBAC)
-- -----------------------------------------------------------------------------

-- Tabla de Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(150) UNIQUE NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Roles del Sistema
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT
);

-- Tabla Catálogo de Permisos Granulares
CREATE TABLE IF NOT EXISTS permisos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo VARCHAR(100) UNIQUE NOT NULL,
    recurso VARCHAR(50) NOT NULL,
    accion VARCHAR(50) NOT NULL,
    descripcion TEXT
);

-- Relación Muchos a Muchos: Usuarios <-> Roles
CREATE TABLE IF NOT EXISTS usuario_roles (
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    rol_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (usuario_id, rol_id)
);

-- Relación Muchos a Muchos: Roles <-> Permisos
CREATE TABLE IF NOT EXISTS rol_permisos (
    rol_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permiso_id INT NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
    PRIMARY KEY (rol_id, permiso_id)
);

-- Permisos Directos por Usuario (Sobreescritura en Caliente: Conceder o Denegar)
CREATE TABLE IF NOT EXISTS usuario_permisos_directos (
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    permiso_id INT NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
    concedido BOOLEAN NOT NULL DEFAULT TRUE,
    otorgado_por INT REFERENCES usuarios(id),
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, permiso_id)
);

-- Tabla de Versamiento Global de Permisos (Para invalidador de caché en caliente)
CREATE TABLE IF NOT EXISTS control_version_permisos (
    id INT PRIMARY KEY DEFAULT 1,
    version INTEGER NOT NULL DEFAULT 1,
    ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- MÓDULO 2: BITÁCORA OPERATIVA Y CONTROL DE TURNOS
-- -----------------------------------------------------------------------------

-- Tabla de Turnos Operativos
CREATE TABLE IF NOT EXISTS turnos (
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

-- Tabla de Eventos / Registros de Bitácora
CREATE TABLE IF NOT EXISTS eventos_bitacora (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    turno_id INT NOT NULL REFERENCES turnos(id) ON DELETE CASCADE,
    usuario_id INT NOT NULL REFERENCES usuarios(id),
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    categoria VARCHAR(50) NOT NULL DEFAULT 'OPERATIVO',
    prioridad VARCHAR(20) NOT NULL DEFAULT 'MEDIA',
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT NOT NULL,
    equipo_afectado VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Instrucciones Especiales (Transmitidas entre turnos)
CREATE TABLE IF NOT EXISTS instrucciones_especiales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    turno_origen_id INT NOT NULL REFERENCES turnos(id),
    fecha_emision TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    instruccion TEXT NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'VIGENTE',
    creado_por INT REFERENCES usuarios(id)
);

-- Tabla de Cierres de Turno (Reporte consolidado de entrega)
CREATE TABLE IF NOT EXISTS cierres_turno (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    turno_id INT UNIQUE NOT NULL REFERENCES turnos(id),
    resumen_operativo TEXT NOT NULL,
    observaciones TEXT,
    folio_pdf VARCHAR(100),
    cerrado_por INT NOT NULL REFERENCES usuarios(id),
    cerrado_por_nombre TEXT,
    ruta_pdf TEXT,
    contenido_texto TEXT,
    tipo_turno TEXT,
    fecha_turno TEXT,
    fecha_cierre TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Equipos Principales de Operación
CREATE TABLE IF NOT EXISTS equipos_operacion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre_equipo VARCHAR(100) NOT NULL,
    estado VARCHAR(50) DEFAULT 'En servicio',
    orden_visual INT NOT NULL
);

-- Tabla Origen: Lecturas Horarias de Operación
CREATE TABLE IF NOT EXISTS bitacora_lecturas_horarias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha_registro DATE NOT NULL DEFAULT CURRENT_DATE,
    hora INT NOT NULL,
    turno VARCHAR(50) NOT NULL,
    precio_tco NUMERIC(10, 2) DEFAULT 0,
    generacion_gas NUMERIC(10, 2) DEFAULT 0,
    generacion_fuego NUMERIC(10, 2) DEFAULT 0,
    generacion_total NUMERIC(10, 2) DEFAULT 0,
    costo_marginal_qta NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla Destino: Resumen de Generación Diaria (Panel Web)
CREATE TABLE IF NOT EXISTS resumen_generacion_diaria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha_turno DATE NOT NULL,
    sistema_prom_mw NUMERIC(10, 1),
    potencia_esperada_mw NUMERIC(10, 0),
    mw_fuegos_suplementarios NUMERIC(10, 0),
    hrs_carga_base INT,
    hrs_minimo_tecnico INT,
    hrs_fuegos_suplementarios INT,
    costo_marginal_usd_mw NUMERIC(10, 1),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla Origen SEN: Programa Diario SEN
CREATE TABLE IF NOT EXISTS programa_diario_sen (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    hora INT,
    precio_tco NUMERIC(10, 2) DEFAULT 0,
    generacion_gn_a NUMERIC(10, 2) DEFAULT 0,
    generacion_gn_b NUMERIC(10, 2) DEFAULT 0,
    consumo_gas NUMERIC(10, 2) DEFAULT 0,
    consumo_fa NUMERIC(10, 2) DEFAULT 0,
    consumo_diesel NUMERIC(10, 2) DEFAULT 0,
    consumo_glp NUMERIC(10, 2) DEFAULT 0,
    cmg_quillota NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Señales Intervenidas / Forzadas
CREATE TABLE IF NOT EXISTS senales_forzadas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    turno_id INT NOT NULL REFERENCES turnos(id) ON DELETE CASCADE,
    codigo_senal VARCHAR(50) NOT NULL,
    nombre_senal VARCHAR(150) NOT NULL,
    estado_senal VARCHAR(50) NOT NULL DEFAULT 'FORZADA',
    motivo TEXT,
    usuario_id INT REFERENCES usuarios(id),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Registro/Historial de Estado de Equipos durante el Turno
CREATE TABLE IF NOT EXISTS equipos_estado_registro (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    turno_id INT NOT NULL REFERENCES turnos(id) ON DELETE CASCADE,
    equipo_id INT REFERENCES equipos_operacion(id),
    codigo_equipo VARCHAR(50) NOT NULL,
    nombre_equipo VARCHAR(100) NOT NULL,
    estado VARCHAR(50) NOT NULL,
    observacion TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vistas en Caliente
CREATE VIEW IF NOT EXISTS v_usuario_permisos_efectivos AS
SELECT DISTINCT
    u.id AS usuario_id,
    u.email,
    u.nombre AS usuario_nombre,
    p.codigo AS permiso_codigo,
    p.recurso,
    p.accion
FROM usuarios u
JOIN usuario_roles ur ON u.id = ur.usuario_id
JOIN rol_permisos rp ON ur.rol_id = rp.rol_id
JOIN permisos p ON rp.permiso_id = p.id
WHERE u.activo = TRUE
  AND NOT EXISTS (
      SELECT 1 FROM usuario_permisos_directos upd 
      WHERE upd.usuario_id = u.id 
        AND upd.permiso_id = p.id 
        AND upd.concedido = FALSE
  )
UNION
SELECT DISTINCT
    u.id AS usuario_id,
    u.email,
    u.nombre AS usuario_nombre,
    p.codigo AS permiso_codigo,
    p.recurso,
    p.accion
FROM usuarios u
JOIN usuario_permisos_directos upd ON u.id = upd.usuario_id
JOIN permisos p ON upd.permiso_id = p.id
WHERE u.activo = TRUE 
  AND upd.concedido = TRUE;

CREATE INDEX IF NOT EXISTS idx_eventos_turno ON eventos_bitacora(turno_id);
CREATE INDEX IF NOT EXISTS idx_eventos_fecha ON eventos_bitacora(fecha_hora);
CREATE INDEX IF NOT EXISTS idx_senales_turno ON senales_forzadas(turno_id);
CREATE INDEX IF NOT EXISTS idx_equipos_estado_turno ON equipos_estado_registro(turno_id);
CREATE INDEX IF NOT EXISTS idx_turnos_estado ON turnos(estado);
CREATE INDEX IF NOT EXISTS idx_permisos_codigo ON permisos(codigo);
