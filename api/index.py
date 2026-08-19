import sys
import os

# Determinar directorio donde se encuentra este script
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
backend_dir = os.path.join(parent_dir, 'backend')

# Asegurar que todas las rutas posibles del backend estén registradas en sys.path
for p in [current_dir, backend_dir, parent_dir]:
    if p and os.path.exists(p) and p not in sys.path:
        sys.path.insert(0, p)

try:
    from server import app as flask_app
except ImportError:
    try:
        from backend.server import app as flask_app
    except ImportError as err:
        raise RuntimeError(f"Error importando server: {err}. sys.path: {sys.path}") from err

class VercelPathFixMiddleware:
    """
    Middleware WSGI para Vercel:
    Asegura que el PATH_INFO de Flask reciba la ruta original completa de la petición
    (ej: /api/turnos/activo, /api/resumen-dia, etc.) en lugar de la ruta reescrita /api/index.py.
    """
    def __init__(self, app):
        self.app = app

    def __call__(self, environ, start_response):
        request_uri = environ.get('REQUEST_URI') or environ.get('RAW_URI') or environ.get('HTTP_X_MATCHED_PATH')
        if request_uri:
            clean_path = request_uri.split('?')[0]
            if clean_path and clean_path != '/api/index.py':
                environ['PATH_INFO'] = clean_path
        return self.app(environ, start_response)

app = VercelPathFixMiddleware(flask_app)
