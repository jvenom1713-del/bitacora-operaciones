import sys
import os

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_dir = os.path.join(os.path.dirname(base_dir), 'backend')

if not os.path.exists(backend_dir):
    backend_dir = os.path.join(base_dir, 'backend')

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from server import app as flask_app

class VercelPathFixMiddleware:
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
