from os import getenv
from .app import app

port = getenv('LISTEN_PORT', '8000')
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(port))
