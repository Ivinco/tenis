from os import getenv
from .app import app

port = getenv('TENIS_BACKEND_PORT', '8000')
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(port))
