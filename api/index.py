import sys
import os
import traceback
import json

current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

try:
    from server import app
except Exception as e:
    from flask import Flask, jsonify
    app = Flask(__name__)
    err_msg = f"Fatal initialization error: {e}"
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def catch_all_error(path):
        return jsonify({
            "status": "error",
            "message": err_msg,
            "trace": traceback.format_exc()
        }), 500

@app.errorhandler(Exception)
def handle_global_exception(e):
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
            start_response('500 Internal Server Error', [('Content-Type', 'application/json')])
            return [json.dumps({
                "status": "error",
                "message": str(ex),
                "trace": traceback.format_exc()
            }).encode('utf-8')]

app.wsgi_app = PathRewriteMiddleware(app.wsgi_app)
