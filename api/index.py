import sys
import os
import traceback
import json

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
backend_dir = os.path.join(parent_dir, 'backend')

for p in [current_dir, backend_dir, parent_dir]:
    if p and os.path.exists(p) and p not in sys.path:
        sys.path.insert(0, p)

try:
    import database
    database.init_db()
except Exception as e:
    print(f"[Index Init DB Warning] {e}")

try:
    from server import app as flask_app
except Exception as e1:
    from flask import Flask, jsonify
    flask_app = Flask(__name__)
    err_msg = f"Error cargando server module: {e1}"
    @flask_app.route('/', defaults={'path': ''})
    @flask_app.route('/<path:path>')
    def catch_all_error(path):
        return jsonify({
            "status": "error",
            "message": err_msg,
            "trace": traceback.format_exc()
        }), 500

@flask_app.errorhandler(Exception)
def handle_exception(e):
    from flask import jsonify
    return jsonify({
        "status": "error",
        "message": str(e),
        "trace": traceback.format_exc()
    }), 500

class PathRewriteMiddleware:
    def __init__(self, wsgi_app):
        self.wsgi_app = wsgi_app

    def __call__(self, environ, start_response):
        try:
            request_uri = environ.get('REQUEST_URI') or environ.get('RAW_URI') or environ.get('HTTP_X_MATCHED_PATH')
            if request_uri:
                clean_path = request_uri.split('?')[0]
                if clean_path and clean_path != '/api/index.py':
                    environ['PATH_INFO'] = clean_path
            return self.wsgi_app(environ, start_response)
        except Exception as ex:
            print(f"[WSGI Middleware Error] {ex}")
            traceback.print_exc()
            start_response('500 Internal Server Error', [('Content-Type', 'application/json')])
            return [json.dumps({
                "status": "error",
                "message": str(ex),
                "trace": traceback.format_exc()
            }).encode('utf-8')]

flask_app.wsgi_app = PathRewriteMiddleware(flask_app.wsgi_app)
app = flask_app
