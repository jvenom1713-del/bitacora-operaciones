"""
Módulo de descarga automática oficial del Coordinador Eléctrico Nacional.

Utiliza la API oficial de S3 del Coordinador:
  1. listPath para obtener el archivo PROGRAMA{YYYYMMDD}.zip
  2. presigned-url-download para obtener el enlace de descarga S3 de AWS
  3. Extrae PRG{YYMMDD}.xlsx de dentro del ZIP
  4. Lee AC8 (Costo Marginal) y SUMA(AC1565:AC1588) (Potencia Esperada)
"""

import requests
import io
import zipfile
import base64
from datetime import datetime, timedelta
from typing import Optional, Tuple, Dict, Any
import openpyxl
from excel_processor import procesar_excel_generacion

USER_KEY = "f3cdad2758436a0a2c2c1fec92853de7"
BUCKET = "cen-programa-operaciones-prod"
LIST_PATH_URL = "https://administracion.api.coordinador.cl/programa-operacion/bucket-s3/s3/listPath"
DOWNLOAD_URL = "https://administracion.api.coordinador.cl/programa-operacion/bucket-s3/s3/presigned-url-download"

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json, text/plain, */*',
}

TIMEOUT = 40


def obtener_url_descarga_s3(file_path: str, file_name: str) -> Optional[str]:
    """
    Obtiene la URL firmada de AWS S3 para descargar un archivo específico.
    """
    try:
        raw_key = f"{file_path}/{file_name}"
        encoded_key = base64.b64encode(raw_key.encode('utf-8')).decode('utf-8')
        params = {
            'encodedKey': encoded_key,
            'user_key': USER_KEY
        }
        r = requests.get(DOWNLOAD_URL, params=params, headers=HEADERS, timeout=TIMEOUT)
        if r.status_code == 200:
            data = r.json()
            return data.get('presignedUrlDownload')
    except Exception as e:
        print(f"[CEN API] Error obteniendo URL presigned: {e}")
    return None


def obtener_archivos_pcp() -> list:
    """
    Obtiene la lista de archivos disponibles en la carpeta PCP mediante la API.
    """
    try:
        params = {
            'user_key': USER_KEY,
            'bucketName': BUCKET,
            'filePath': 'PCP'
        }
        r = requests.get(LIST_PATH_URL, params=params, headers=HEADERS, timeout=TIMEOUT)
        if r.status_code == 200:
            return r.json()
    except Exception as e:
        print(f"[CEN API] Error consultando listPath: {e}")
    return []


def descargar_excel_programa(fecha: Optional[datetime] = None, max_dias_atras: int = 3) -> Tuple[Optional[bytes], Optional[bytes], Optional[str], Optional[str]]:
    """
    Descarga los Excel PRG*.xlsx y PO*.xlsx desde el archivo PROGRAMA*.zip del Coordinador.
    """
    archivos_pcp = obtener_archivos_pcp()
    
    nombres_archivos = []
    if isinstance(archivos_pcp, list):
        for item in archivos_pcp:
            if isinstance(item, dict) and 'name' in item:
                nombres_archivos.append(item['name'])
            elif isinstance(item, str):
                nombres_archivos.append(item)
    
    zips_disponibles = [n for n in nombres_archivos if 'PROGRAMA' in n.upper() and n.endswith('.zip')]
    zips_disponibles.sort(reverse=True)

    fechas_a_probar = []
    if fecha is not None:
        fechas_a_probar = [fecha - timedelta(days=d) for d in range(max_dias_atras + 1)]
    else:
        hoy = datetime.now()
        fechas_a_probar = [hoy + timedelta(days=1)] + [hoy - timedelta(days=d) for d in range(max_dias_atras + 1)]

    candidatos_zip = []
    version_suffixes = ['_v10', '_v9', '_v8', '_v7', '_v6', '_v5', '_v4', '_v3', '_v2', '_v1', '', '_def', '_final']

    for f in fechas_a_probar:
        fecha8 = f.strftime('%Y%m%d')
        coincidencias = [z for z in zips_disponibles if fecha8 in z]
        if coincidencias:
            candidatos_zip.extend(coincidencias)
        else:
            for suff in version_suffixes:
                candidatos_zip.append((f"PROGRAMA{fecha8}{suff}.zip", f.strftime('%Y-%m-%d')))

    for z in zips_disponibles:
        if not any(z == (c[0] if isinstance(c, tuple) else c) for c in candidatos_zip):
            candidatos_zip.append((z, datetime.now().strftime('%Y-%m-%d')))

    for item in candidatos_zip:
        zip_name, f_str = item if isinstance(item, tuple) else (item, datetime.now().strftime('%Y-%m-%d'))
        print(f"[CEN API] Intentando descargar {zip_name} desde AWS S3...")
        url_s3 = obtener_url_descarga_s3("PCP", zip_name)

        if url_s3:
            try:
                r = requests.get(url_s3, timeout=60)
                if r.status_code == 200 and len(r.content) > 10_000:
                    print(f"[CEN API] [OK] ZIP Descargado: {len(r.content):,} bytes ({zip_name})")
                    
                    with zipfile.ZipFile(io.BytesIO(r.content)) as zf:
                        namelist = zf.namelist()
                        
                        prg_files = [n for n in namelist if n.upper().startswith('PRG') and n.endswith(('.xlsx', '.xlsm'))]
                        po_files = [n for n in namelist if n.upper().startswith('PO') and n.endswith(('.xlsx', '.xlsm'))]
                        
                        prg_target = prg_files[0] if prg_files else None
                        po_target = po_files[0] if po_files else None

                        if not prg_target:
                            xlsx_files = [n for n in namelist if n.endswith(('.xlsx', '.xlsm'))]
                            if xlsx_files:
                                prg_target = xlsx_files[-1]

                        if prg_target:
                            print(f"[CEN API] [OK] Extrayendo Excel PRG: {prg_target}")
                            prg_bytes = zf.read(prg_target)
                            po_bytes = zf.read(po_target) if po_target else None
                            return prg_bytes, po_bytes, f"Coordinador Eléctrico Nacional ({zip_name} / {prg_target})", f_str
            except Exception as e:
                print(f"[CEN API] Error procesando {zip_name}: {e}")

    print("[CEN API] [X] No se encontro el archivo del Programa de Operacion.")
    return None, None, None, None


def descargar_y_procesar_coordinador(fecha: Optional[datetime] = None) -> Dict[str, Any]:
    """
    Función principal: descarga el Programa de Operación y extrae los parámetros calculados.
    """
    fallback = {
        "status": "sin_datos",
        "fuente": None,
        "fecha_turno": datetime.now().strftime('%Y-%m-%d'),
        "sistema_prom_mw": 56.7,
        "costo_marginal_usd_mw": 52.9,
        "potencia_esperada_mw": 4004,
        "mw_fuegos_suplementarios": 0,
        "hrs_carga_base": 0,
        "hrs_minimo_tecnico": 22,
        "hrs_fuegos_suplementarios": 0,
    }

    prg_bytes, po_bytes, fuente, fecha_str = descargar_excel_programa(fecha)
    if not prg_bytes:
        return fallback

    try:
        wb_prg = openpyxl.load_workbook(io.BytesIO(prg_bytes), data_only=True)
        wb_po = openpyxl.load_workbook(io.BytesIO(po_bytes), data_only=True) if po_bytes else None
        
        resumen = procesar_excel_generacion(wb_prg, wb_po)
        resumen["status"] = "ok"
        resumen["fuente"] = fuente
        resumen["fecha_turno"] = fecha_str or datetime.now().strftime('%Y-%m-%d')
        print(f"[CEN API] [OK] Calculo final ({resumen['fecha_turno']}): SistemaProm={resumen['sistema_prom_mw']} USD/MWh, "
              f"Pot.Esperada={resumen['potencia_esperada_mw']} MW, "
              f"CostoMarginal={resumen['costo_marginal_usd_mw']} USD/MWh")
        return resumen
    except Exception as e:
        print(f"[CEN API] [X] Error procesando el libro Excel: {e}")
        return {**fallback, "status": "error_procesamiento", "error": str(e)}


