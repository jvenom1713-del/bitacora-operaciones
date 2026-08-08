-- =============================================================================
-- CONSULTAS DE BITÁCORA Y ESTRUCTURACIÓN DE DATOS CON JERARQUÍA VISUAL
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ENCABEZADOS SUPERIORES (DATOS DESTACADOS PRINCIPALES)
-- -----------------------------------------------------------------------------
-- La salida configura estos campos para ser renderizados como texto principal y destacado.

SELECT 
    'GMETROPOLITANA' AS marca_corporativa,
    u.email AS usuario_destacado_email,
    'Central Nueva Renca' AS planta_destacada_nombre,
    CURRENT_DATE AS fecha_destacada,
    t.folio AS codigo_destacado_folio
FROM turnos t
JOIN usuarios u ON t.operador_id = u.id
WHERE t.estado = 'ABIERTO'
LIMIT 1;

-- -----------------------------------------------------------------------------
-- 2. ABASTECIMIENTO, GENERACIÓN DIARIA Y ESTADO DE PLANTA (ETIQUETAS Y VALORES DESTACADOS)
-- -----------------------------------------------------------------------------
-- Ajuste de alias SQL: Títulos en formato etiqueta (pequeño) y valores numéricos con máxima prioridad visual.

-- A. GENERACIÓN DIARIA
SELECT 
    'DESPACHO CNR'          AS label_despacho_cnr,     'En servicio' AS val_despacho_cnr,
    'SISTEMA PROM'          AS label_sistema_prom,     '12500'       AS val_sistema_prom,
    '(MW) POT ESPERA'       AS label_pot_espera,       '297'         AS val_pot_espera,
    '(MW) FUEGOS SUPLEMEN'  AS label_fuegos_suplem,    '0'           AS val_fuegos_suplem,
    'HRS CARGA BASE'        AS label_hrs_carga_base,   '24'          AS val_hrs_carga_base,
    'HRS MIN TEC'           AS label_hrs_min_tec,      '0'           AS val_hrs_min_tec,
    'HRS FUEGOS SUPLEM'     AS label_hrs_fuegos_suple, '0'           AS val_hrs_fuegos_suple,
    'MILES (M3) GAS'        AS label_miles_m3_gas,     '0'           AS val_miles_m3_gas,
    '(M3) FA'               AS label_m3_fa,            '0'           AS val_m3_fa,
    '(M3) DIESEL'           AS label_m3_diesel,        '0'           AS val_m3_diesel,
    '(KG) GAS GLP'          AS label_kg_gas_glp,       '0'           AS val_kg_gas_glp,
    'COSTO MARGINAL USD/MW' AS label_costo_marginal,   '58.4'        AS val_costo_marginal;

-- B. ESTADO DE PLANTA
SELECT 
    'ESTADO DE OPERACIÓN'  AS label_estado_operacion,    'AGC'                    AS val_estado_operacion,
    'TIPO DE COMBUSTIBLE'  AS label_tipo_combustible,    'Gas'                    AS val_tipo_combustible,
    'TIPO DE GAS'          AS label_tipo_gas,            'NUEVARENCA_TG1+TV1_GN_A' AS val_tipo_gas,
    'GEN (MWH)'            AS label_gen_mwh,             '297'                    AS val_gen_mwh,
    'DISPONIBILIDAD PLANTA' AS label_disponibilidad_planta,'SH2'                  AS val_disponibilidad_planta;

-- C. ABASTECIMIENTO
SELECT 
    'DIESEL 5000 MM'   AS label_diesel5000,   '6563' AS val_diesel5000,
    'DIESEL 850 %'     AS label_diesel850,    '94'   AS val_diesel850,
    'GLP 110 %'        AS label_glp110,       '87'   AS val_glp110,
    'GLP 65 %'         AS label_glp65,        '87'   AS val_glp65,
    'H2 TG'            AS label_h2tg,         '115'  AS val_h2tg,
    'H2 TV'            AS label_h2tv,         '109'  AS val_h2tv,
    'NH3 75 M3'        AS label_nh375,        '77.8' AS val_nh375,
    'VIGAFLOW'         AS label_vigaflow,     'Fuera de servicio' AS val_vigaflow,
    'DEMI 2595 %'      AS label_demi2595,     '84'   AS val_demi2595,
    'SCI 1700 %'       AS label_sci1700,      '86'   AS val_sci1700,
    'H2SO4 45 CM'      AS label_h2so445,      '111'  AS val_h2so445,
    'NACL 75 CM'       AS label_nacl75,       '31'   AS val_nacl75,
    'NIVEL TK CO2'     AS label_nivel_tk_co2, '0'    AS val_nivel_tk_co2,
    'BUNDLE HIDROGENO' AS label_bundle_h2,    '0'    AS val_bundle_h2,
    'BUNDLE VACIOS'    AS label_bundle_vacios,'0'    AS val_bundle_vacios,
    'VEOLIA'           AS label_veolia,       'Fuera de servicio' AS val_veolia;

-- -----------------------------------------------------------------------------
-- 3. EQUIPOS PRINCIPALES DE OPERACIÓN (AGRUPACIÓN COMPACTA EN MATRIZ DE 12 COLUMNAS)
-- -----------------------------------------------------------------------------
-- Consulta compacta que asigna orden_visual y agrupa cada celda sin espacio sobrante.

WITH todos_equipos AS (
    SELECT 
        id,
        codigo AS equipo_nombre,
        estado AS equipo_estado,
        orden_visual
    FROM equipos_operacion

    UNION ALL

    SELECT 
        9999 AS id,
        '' AS equipo_nombre,
        'N/A' AS equipo_estado,
        9999 AS orden_visual
),
equipos_ordenados AS (
    SELECT 
        id,
        equipo_nombre,
        equipo_estado,
        ROW_NUMBER() OVER (ORDER BY orden_visual) AS global_idx,
        ((ROW_NUMBER() OVER (ORDER BY orden_visual) - 1) / 12) + 1 AS num_fila,
        ((ROW_NUMBER() OVER (ORDER BY orden_visual) - 1) % 12) + 1 AS col_en_fila
    FROM todos_equipos
)
SELECT 
    num_fila,
    MAX(CASE WHEN col_en_fila = 1  THEN equipo_nombre || ':' || equipo_estado END) AS col_1,
    MAX(CASE WHEN col_en_fila = 2  THEN equipo_nombre || ':' || equipo_estado END) AS col_2,
    MAX(CASE WHEN col_en_fila = 3  THEN equipo_nombre || ':' || equipo_estado END) AS col_3,
    MAX(CASE WHEN col_en_fila = 4  THEN equipo_nombre || ':' || equipo_estado END) AS col_4,
    MAX(CASE WHEN col_en_fila = 5  THEN equipo_nombre || ':' || equipo_estado END) AS col_5,
    MAX(CASE WHEN col_en_fila = 6  THEN equipo_nombre || ':' || equipo_estado END) AS col_6,
    MAX(CASE WHEN col_en_fila = 7  THEN equipo_nombre || ':' || equipo_estado END) AS col_7,
    MAX(CASE WHEN col_en_fila = 8  THEN equipo_nombre || ':' || equipo_estado END) AS col_8,
    MAX(CASE WHEN col_en_fila = 9  THEN equipo_nombre || ':' || equipo_estado END) AS col_9,
    MAX(CASE WHEN col_en_fila = 10 THEN equipo_nombre || ':' || equipo_estado END) AS col_10,
    MAX(CASE WHEN col_en_fila = 11 THEN equipo_nombre || ':' || equipo_estado END) AS col_11,
    MAX(CASE WHEN col_en_fila = 12 THEN equipo_nombre || ':' || equipo_estado END) AS col_12
FROM equipos_ordenados
GROUP BY num_fila
ORDER BY num_fila;

-- -----------------------------------------------------------------------------
-- 4. CONSULTA DE PERMISOS EN CALIENTE (DYNAMIC RBAC)
-- -----------------------------------------------------------------------------

SELECT permiso_codigo, recurso, accion
FROM v_usuario_permisos_efectivos
WHERE usuario_id = 2;

-- -----------------------------------------------------------------------------
-- 5. CÁLCULO ETL Y RESUMEN DE GENERACIÓN DIARIA DESDE LECTURAS HORARIAS
-- -----------------------------------------------------------------------------
-- Inserta la agregación calculada desde la tabla bitacora_lecturas_horarias
-- hacia la tabla resumen_generacion_diaria que alimenta el panel web.

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

-- Consulta de verificación del resumen diario generado
SELECT * FROM resumen_generacion_diaria ORDER BY fecha_turno DESC;

-- -----------------------------------------------------------------------------
-- 6. CONSULTA PROGRAMA DIARIO SEN (ESTRUCTURA DE 12 CAMPOS EN 2 FILAS)
-- -----------------------------------------------------------------------------
-- Calcula la matriz de 12 campos de Generación Diaria (Fila 1 y Fila 2)
-- desde la tabla origen programa_diario_sen.

SELECT 
    -- ==========================================
    -- FILA 1 (De izquierda a derecha)
    -- ==========================================
    
    -- 1. DESPACHO CNR
    'Fuera de servicio' AS despacho_cnr, 
    
    -- 2. SISTEMA PROM
    ROUND(AVG(precio_tco), 1) AS sistema_prom, 
    
    -- 3. (MW) POT ESPERA
    ROUND(SUM(generacion_gn_a + generacion_gn_b), 0) AS pot_esperada_mw, 
    
    -- 4. (MW) FUEGOS SUPLEMEN
    ROUND(SUM(generacion_gn_b), 0) AS mw_fuegos_suplemen, 
    
    -- 5. HRS CARGA BASE
    SUM(CASE WHEN (generacion_gn_a + generacion_gn_b) >= 330 THEN 1 ELSE 0 END) AS hrs_carga_base, 
    
    -- 6. HRS MIN TEC
    SUM(CASE WHEN generacion_gn_a = 160 AND generacion_gn_b = 0 THEN 1 ELSE 0 END) AS hrs_min_tec,

    -- ==========================================
    -- FILA 2 (De izquierda a derecha)
    -- ==========================================
    
    -- 7. HRS FUEGOS SUPLEM
    SUM(CASE WHEN generacion_gn_b > 32 THEN 1 ELSE 0 END) AS hrs_fuegos_suplem, 
    
    -- 8. MILES (M3) GAS 
    ROUND(SUM(consumo_gas) / 1000, 1) AS miles_m3_gas, 
    
    -- 9. (M3) FA
    SUM(consumo_fa) AS m3_fa, 
    
    -- 10. (M3) DIESEL
    SUM(consumo_diesel) AS m3_diesel, 
    
    -- 11. (KG) GAS GLP
    SUM(consumo_glp) AS kg_gas_glp, 
    
    -- 12. COSTO MARGINAL
    ROUND(AVG(cmg_quillota), 1) AS costo_marginal

FROM 
    programa_diario_sen
WHERE 
    fecha = CURRENT_DATE 
GROUP BY 
    fecha;
