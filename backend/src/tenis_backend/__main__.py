from os import getenv
from sys import stderr, exit
from .app import app, socketio
from .mongo_migrate import run_migrations

port = app.config['LISTEN_PORT']
host = app.config['LISTEN_HOST']
if not app.config['API_TOKEN']:
    print("APP_TOKEN env var is required to run backend server", file = stderr)
    exit(1)


# use_reloader=False is needed because of
# https://stackoverflow.com/questions/9449101/how-to-stop-flask-from-initialising-twice-in-debug-mode/9476701#9476701
if __name__ == '__main__':
    
    print("Updating MongoDB...")
    run_migrations()

    print("Starting the server...")
    socketio.run(app, host=host, port=int(port), allow_unsafe_werkzeug=True, use_reloader=False)
