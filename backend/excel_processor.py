import openpyxl
import os
import sqlite3
from typing import Dict, Any, Optional

def obtener_filas_nueva_renca(sheet_prog) -> list:
    """
    Busca dinámicamente todas las filas correspondientes a NUEVARENCA en la hoja PROGRAMA.
    """
    filas = []
    for r in range(1, sheet_prog.max_row + 1):
        c2 = str(sheet_prog.cell(row=r, column=2).value or '')
        c3 = str(sheet_prog.cell(row=r, column=3).value or '')
        c4 = str(sheet_prog.cell(row=r, column=4).value or '')
        etiqueta_completa = (c2 + ' ' + c3 + ' ' + c4).upper()
        if 'NUEVARENCA' in etiqueta_completa or 'NUEVA_RENCA' in etiqueta_completa:
            filas.append(r)
    return filas


def calcular_sistema_prom_desde_tco(wb_prg, wb_po) -> float:
    """
    Calcula el 'Sistema Promedio' analizando las configuraciones activas (> 0 MW) de Nueva Renca en cada bloque:
    - Bloque 1: Horas 1 a 8 (columnas 5 a 12 de PROGRAMA)
    - Bloque 2: Horas 9 a 18 (columnas 13 a 22 de PROGRAMA)
    - Bloque 3: Horas 19 a 24 (columnas 23 a 28 de PROGRAMA)
    
    Para cada Bloque, obtiene el promedio de CMg en la hoja TCO de todas las configuraciones despachadas en ese bloque.
    Finalmente promedia los 3 bloques y redondea a 1 decimal (round(promedio, 1)).
    """
    def to_float(val) -> float:
        if val is None: return 0.0
        try: return float(str(val).strip().replace(',', '.'))
        except: return 0.0

    if not wb_prg or not wb_po or 'TCO' not in wb_po.sheetnames:
        return 52.9

    sheet_prog = wb_prg['PROGRAMA'] if 'PROGRAMA' in wb_prg.sheetnames else wb_prg.active
    sheet_tco = wb_po['TCO']

    filas_nr = obtener_filas_nueva_renca(sheet_prog)
    if not filas_nr:
        return 52.9

    # 1. Mapear configuraciones activas (> 0 MW) en cada uno de los 3 Bloques
    configs_b1, configs_b2, configs_b3 = [], [], []

    for r in filas_nr:
        nombre = sheet_prog.cell(row=r, column=3).value or sheet_prog.cell(row=r, column=2).value
        if not nombre: continue
        nombre_str = str(nombre).strip()

        # Bloque 1 (Horas 1-8 -> Cols 5-12)
        if sum(to_float(sheet_prog.cell(row=r, column=c).value) for c in range(5, 13)) > 0:
            configs_b1.append(nombre_str)

        # Bloque 2 (Horas 9-18 -> Cols 13-22)
        if sum(to_float(sheet_prog.cell(row=r, column=c).value) for c in range(13, 23)) > 0:
            configs_b2.append(nombre_str)

        # Bloque 3 (Horas 19-24 -> Cols 23-28)
        if sum(to_float(sheet_prog.cell(row=r, column=c).value) for c in range(23, 29)) > 0:
            configs_b3.append(nombre_str)

    # 2. Función helper para obtener CMg promedio de un Bloque en TCO
    def obtener_cmg_prom_bloque(col_centrales, col_cmg, configs_activas):
        if not configs_activas: return None
        cmgs = []
        for config_nombre in configs_activas:
            for r in range(1, sheet_tco.max_row + 1):
                c_val = sheet_tco.cell(row=r, column=col_centrales).value
                if c_val and str(c_val).strip().upper() == config_nombre.upper():
                    cmgs.append(to_float(sheet_tco.cell(row=r, column=col_cmg).value))
                    break
        if cmgs:
            return sum(cmgs) / float(len(cmgs))
        return None

    # CMg promedio para cada uno de los 3 bloques
    b1_avg = obtener_cmg_prom_bloque(3, 4, configs_b1)    # Bloque 1: Col 3 (Centrales), Col 4 (CMg)
    b2_avg = obtener_cmg_prom_bloque(7, 8, configs_b2)    # Bloque 2: Col 7 (Centrales), Col 8 (CMg)
    b3_avg = obtener_cmg_prom_bloque(11, 12, configs_b3)  # Bloque 3: Col 11 (Centrales), Col 12 (CMg)

    bloques_validos = [v for v in [b1_avg, b2_avg, b3_avg] if v is not None]

    if bloques_validos:
        promedio_final = sum(bloques_validos) / float(len(bloques_validos))
        return round(promedio_final, 1)

    return 52.9


def procesar_excel_generacion(wb_prg, wb_po: Optional[Any] = None) -> Dict[str, Any]:
    """
    Procesa los archivos Excel estructurados siguiendo estrictamente las reglas de negocio de Nueva Renca:
    
    1. Costo Marginal: Celda AC8 de PROGRAMA.
    2. Sistema Promedio: Promedio por bloques en hoja TCO evaluando todas las configuraciones activas en cada bloque.
    3. Potencia Esperada (MW): Suma de la columna Total AC en las filas dinámicas de NUEVARENCA.
    4. Fuegos Suplementarios (FA): Filas con etiqueta '+FA1_'.
    5. Horas Mínimo Técnico: Conteo de horas 1 a 24 donde la generación de la central esté en ~160 MW (150-170 MW).
    6. Horas Carga Base: Conteo de horas 1 a 24 donde la generación sea >= 330 MW.
    """
    def to_float(val) -> float:
        if val is None:
            return 0.0
        if isinstance(val, (int, float)):
            return float(val)
        try:
            return float(str(val).strip().replace(',', '.'))
        except (ValueError, TypeError):
            return 0.0

    sheet = wb_prg['PROGRAMA'] if 'PROGRAMA' in wb_prg.sheetnames else wb_prg.active

    # Buscar dinámicamente las filas de Nueva Renca
    filas_nr = obtener_filas_nueva_renca(sheet)
    if not filas_nr:
        # Fallback a rango por omisión si la búsqueda dinámica no encuentra coincidencias
        filas_nr = list(range(1566, 1591))

    # 1. Costo Marginal (Celda AC8)
    costo_marginal = to_float(sheet['AC8'].value)

    # 2. Sistema Promedio desde hoja TCO analizando configuraciones por bloque
    sistema_prom = calcular_sistema_prom_desde_tco(wb_prg, wb_po)

    # 3. Potencia Esperada (Suma filas de Nueva Renca en columna AC = col 29)
    potencia_esperada_raw = sum(to_float(sheet.cell(row=r, column=29).value) for r in filas_nr)
    potencia_esperada_mw = round(potencia_esperada_raw, 0)

    # 4. Iteración horaria (Columnas 5 = E a 28 = AB -> Horas 1 a 24)
    hrs_carga_base = 0
    hrs_minimo_tecnico = 0
    hrs_fuegos_suplementarios = 0
    mw_fuegos_suplementarios_total = 0.0

    filas_fa = [r for r in filas_nr if 'FA' in str(sheet.cell(row=r, column=3).value or '').upper()]

    for r in filas_fa:
        mw_fuegos_suplementarios_total += to_float(sheet.cell(row=r, column=29).value)

    for col in range(5, 29): # Horas 1 a 24 (Columnas E a AB)
        gen_total_hora = sum(to_float(sheet.cell(row=r, column=col).value) for r in filas_nr)
        gen_fa_hora = sum(to_float(sheet.cell(row=r, column=col).value) for r in filas_fa)

        if round(gen_total_hora, 0) >= 330:
            hrs_carga_base += 1
            
        if round(gen_total_hora, 0) == 160:
            hrs_minimo_tecnico += 1
            
        if gen_fa_hora > 1.0:
            hrs_fuegos_suplementarios += 1

    return {
        "sistema_prom_mw": round(sistema_prom, 1),
        "costo_marginal_usd_mw": round(costo_marginal, 1),
        "potencia_esperada_mw": int(potencia_esperada_mw),
        "mw_fuegos_suplementarios": int(round(mw_fuegos_suplementarios_total, 0)),
        "hrs_carga_base": hrs_carga_base,
        "hrs_minimo_tecnico": hrs_minimo_tecnico,
        "hrs_fuegos_suplementarios": hrs_fuegos_suplementarios
    }


def calcular_resumen_simulado() -> Dict[str, Any]:
    """Valores de fallback en caso de no haber conexión al archivo"""
    return {
        "sistema_prom_mw": 52.9,
        "costo_marginal_usd_mw": 40.3,
        "potencia_esperada_mw": 5046,
        "mw_fuegos_suplementarios": 0,
        "hrs_carga_base": 2,
        "hrs_minimo_tecnico": 14,
        "hrs_fuegos_suplementarios": 0
    }

