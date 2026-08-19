import sys
import os

_current_dir = os.path.dirname(os.path.abspath(__file__))
if _current_dir not in sys.path:
    sys.path.insert(0, _current_dir)

import requests
import io
import zipfile
import base64
from datetime import datetime, timedelta
from typing import Optional, Tuple, Dict, Any
import openpyxl

try:
    from excel_processor import procesar_excel_generacion
except ImportError:
    try:
        from .excel_processor import procesar_excel_generacion
    except ImportError:
        from api.excel_processor import procesar_excel_generacion

USER_KEY = "f3cdad2758436a0a2c2c1fec92853de7"
BUCKET = "cen-programa-operaciones-prod"
LIST_PATH_URL = "https://administracion.api.coordinador.cl/programa-operacion/bucket-s3/s3/listPath"
DOWNLOAD_URL = "https://administracion.api.coordinador.cl/programa-operacion/bucket-s3/s3/presigned-url-download"

HEADERS = {
    "user-key": USER_KEY,
    "Content-Type": "application/json",
    "Accept": "application/json, text/plain, */*",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def listar_archivos_s3(prefix: str) -> list:
    payload = {"bucket": BUCKET, "prefix": prefix}
    try:
        r = requests.post(LIST_PATH_URL, json=payload, headers=HEADERS, timeout=12)
        if r.status_code == 200:
            data = r.json()
            if isinstance(data, list): return data
            if isinstance(data, dict): return data.get("data", data.get("contents", []))
    except Exception as e:
        print(f"[CEN API Error] listPath prefix={prefix}: {e}")
    return []

def obtener_presigned_url(s3_path: str) -> Optional[str]:
    payload = {"bucket": BUCKET, "path": s3_path}
    try:
        r = requests.post(DOWNLOAD_URL, json=payload, headers=HEADERS, timeout=12)
        if r.status_code == 200:
            data = r.json()
            if isinstance(data, str) and data.startswith("http"): return data
            if isinstance(data, dict):
                return data.get("url") or data.get("presignedUrl") or data.get("data")
    except Exception as e:
        print(f"[CEN API Error] presigned-url path={s3_path}: {e}")
    return None

def descargar_y_procesar_coordinador(fecha_ref: Optional[datetime] = None) -> Dict[str, Any]:
    if not fecha_ref:
        fecha_ref = datetime.now()

    dias_probar = [fecha_ref, fecha_ref + timedelta(days=1), fecha_ref - timedelta(days=1)]
    
    for dt in dias_probar:
        date_str = dt.strftime("%Y%m%d")
        year_str = dt.strftime("%Y")
        month_str = dt.strftime("%m")
        
        prefix = f"PROGRAMAS/{year_str}/{month_str}/PROGRAMA{date_str}"
        archivos = listar_archivos_s3(prefix)
        
        zip_files = [a for a in archivos if str(a.get("path", "")).upper().endswith(".ZIP")]
        if not zip_files:
            continue
            
        target_file = zip_files[-1]
        s3_path = target_file.get("path")
        
        url_descarga = obtener_presigned_url(s3_path)
        if not url_descarga:
            continue
            
        try:
            res_zip = requests.get(url_descarga, timeout=30)
            if res_zip.status_code == 200:
                with zipfile.ZipFile(io.BytesIO(res_zip.content)) as z:
                    xlsx_names = [n for n in z.namelist() if n.upper().endswith(".XLSX") or n.upper().endswith(".XLSM")]
                    if xlsx_names:
                        prg_name = next((n for n in xlsx_names if "PRG" in n.upper() or "PROGRAMA" in n.upper()), xlsx_names[0])
                        with z.open(prg_name) as f_excel:
                            wb = openpyxl.load_workbook(io.BytesIO(f_excel.read()), data_only=True)
                            resumen = procesar_excel_generacion(wb)
                            resumen["status"] = "ok"
                            resumen["fuente"] = f"coordinador.cl ({prg_name})"
                            resumen["fecha_turno"] = dt.strftime('%Y-%m-%d')
                            return resumen
        except Exception as e:
            print(f"[CEN Download Error] {e}")

    return {
        "status": "error",
        "message": "No se pudo descargar o procesar la planilla de programación del CEN."
    }
