import sys
import os

# Configuración del PATH para importar los módulos del backend
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_dir = os.path.join(base_dir, 'backend')

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from server import app
