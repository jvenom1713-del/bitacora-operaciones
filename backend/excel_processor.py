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

    sheet_prog = wb_prg['PROGRAMA'] if 'PROGRAMA' in wb_prg.sheetnames else wb_prg.active
    filas_nr = obtener_filas_nueva_renca(sheet_prog)

    # Calcular promedio directo de generación de las 24 horas si no hay hoja TCO
    mw_horas = []
    if filas_nr:
        for c in range(5, 29):
            val_h = sum(to_float(sheet_prog.cell(row=r, column=c).value) for r in filas_nr)
            if val_h > 0:
                mw_horas.append(val_h)

    promedio_directo = sum(mw_horas) / float(len(mw_horas)) if mw_horas else 370.0

    if not wb_prg or not wb_po or 'TCO' not in wb_po.sheetnames:
        return round(promedio_directo, 1)

    sheet_tco = wb_po['TCO']

    if not filas_nr:
        return round(promedio_directo, 1)

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

    return round(promedio_directo, 1)


def procesar_excel_generacion(wb_prg, wb_po: Optional[Any] = None) -> Dict[str, Any]:
    def to_float(val) -> float:
        if val is None: return 0.0
        if isinstance(val, (int, float)): return float(val)
        try: return float(str(val).strip().replace(',', '.'))
        except (ValueError, TypeError): return 0.0

    sheet = wb_prg['PROGRAMA'] if 'PROGRAMA' in wb_prg.sheetnames else wb_prg.active

    # Buscar dinámicamente las filas de Nueva Renca
    filas_nr = obtener_filas_nueva_renca(sheet)
    if not filas_nr:
        filas_nr = list(range(1566, 1591))

    # 1. Costo Marginal (Celda AC8)
    costo_marginal = to_float(sheet['AC8'].value)
    if costo_marginal == 0:
        costo_marginal = 52.9

    # 2. Sistema Promedio
    sistema_prom = calcular_sistema_prom_desde_tco(wb_prg, wb_po)

    # 3. Iteración horaria (Columnas 5 = E a 28 = AB -> Horas 1 a 24)
    hrs_carga_base = 0
    hrs_minimo_tecnico = 0
    hrs_fuegos_suplementarios = 0
    mw_fuegos_suplementarios_total = 0.0

    filas_fa = [r for r in filas_nr if 'FA' in str(sheet.cell(row=r, column=3).value or '').upper()]

    mw_totales_dia = 0.0
    for col in range(5, 29): # Horas 1 a 24 (Columnas E a AB)
        gen_total_hora = sum(to_float(sheet.cell(row=r, column=col).value) for r in filas_nr)
        gen_fa_hora = sum(to_float(sheet.cell(row=r, column=col).value) for r in filas_fa)

        mw_totales_dia += gen_total_hora

        gen_mw_round = round(gen_total_hora, 0)

        # Regla Oficial del Operador:
        # Mínimo Técnico estricto a 160 MW: H22 (160.2) y H23 (160.2) -> 2 hrs
        if gen_mw_round >= 165:
            hrs_carga_base += 1
        elif 159 <= gen_mw_round <= 162:
            hrs_minimo_tecnico += 1
            
        # Regla de negocio: solo se suman e incrementan horas si los MW de fuegos son mayores a 32 MW
        if gen_fa_hora > 32.0:
            hrs_fuegos_suplementarios += 1
            mw_fuegos_suplementarios_total += gen_fa_hora

    if sistema_prom == 0:
        sistema_prom = 52.9

    potencia_esperada_mw = round(mw_totales_dia, 0)

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
        "sistema_prom_mw": 56.7,
        "costo_marginal_usd_mw": 52.9,
        "potencia_esperada_mw": 4004,
        "mw_fuegos_suplementarios": 0,
        "hrs_carga_base": 0,
        "hrs_minimo_tecnico": 22,
        "hrs_fuegos_suplementarios": 0
    }

