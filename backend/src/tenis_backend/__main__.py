from os import getenv
from .app import app, socketio

port = app.config['LISTEN_PORT']
host = app.config['LISTEN_HOST']
if __name__ == '__main__':
    socketio.run(app, host=host, port=int(port))
