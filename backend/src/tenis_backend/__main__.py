from os import getenv
from .app import app, socketio

port = app.config['LISTEN_PORT']
host = app.config['LISTEN_HOST']


# use_reloader=False is needed because of
# https://stackoverflow.com/questions/9449101/how-to-stop-flask-from-initialising-twice-in-debug-mode/9476701#9476701
if __name__ == '__main__':
    print("Starting the server...")
    socketio.run(app, host=host, port=int(port), allow_unsafe_werkzeug=True, use_reloader=False)
