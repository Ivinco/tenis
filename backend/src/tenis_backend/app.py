import os
import jwt
import atexit
from flask import Flask, request
from flask_cors import CORS
from pymongo import MongoClient
from flask_sock import Sock
from .auth import token_required, sock_auth
from .user import User

# Get environment variables - probably later to be moved to config file
mongo_host = os.getenv('MONGO_HOST', 'localhost')  # Default to 'localhost' if not set
mongo_dbname = os.getenv('MONGO_DBNAME', 'tenis')  # Default to 'database' if not set
connection_string = f"mongodb://{mongo_host}/{mongo_dbname}"
secret_key = os.getenv('SECRET', 'big tenis')  # Secret key to use

app = Flask(__name__)
sock = Sock(app)
CORS(app)
app.mongodb_client = MongoClient(connection_string)
app.db = app.mongodb_client[mongo_dbname]
app.config['SECRET_KEY'] = secret_key


def cleanup_on_shutdown():
    """Properly close MongoDB connection on shutdown"""
    app.mongodb_client.close()


atexit.register(cleanup_on_shutdown)


@sock.route('/alerts')
def alerts(ws):
    if not sock_auth(request):
        ws.close(reason=1000, message="Auth failed")
    while True:
        data = ws.receive()
        ws.send(data)


@sock.route('/new')
def new(ws):
    if not sock_auth(request):
        ws.close(reason=1000, message="Auth failed")
    while True:
        data = ws.receive()
        ws.send(data)


@sock.route('/changed')
def changed(ws):
    if not sock_auth(request):
        ws.close(reason=1000, message="Auth failed")
    while True:
        data = ws.receive()
        ws.send(data)


@sock.route('/resolved')
def resolved(ws):
    if not sock_auth(request):
        ws.close(reason=1000, message="Auth failed")
    while True:
        data = ws.receive()
        ws.send(data)


@app.route("/")
def index():
    return "Hello, world!\n", 200


@app.route("/whoami")
@token_required
def whoami(current_user):
    """Sample method to demonstrate @token_required decorator"""
    return "You are authorized as %s\n" % (current_user['email']), 200


@app.route("/healz")
def healz():
    try:
        app.db.command('ping')
    except Exception as e:
        return f"Mongo error: {e!r}\n", 500
    return "tenis is big as ever\n", 200


@app.route("/auth", methods=["POST"])
def login():
    try:
        data = request.get_json(force=True, silent=False)
        if not data:
            return dict(message="Please provide user credentials in JSON format", data=None, error="Bad request"), 400

        user = User().login(
            data.get('email'),
            data.get('password')
        )
        if user:
            try:
                user["token"] = jwt.encode(
                    {"user_id": user["_id"]},
                    app.config["SECRET_KEY"],
                    algorithm="HS256"
                )
                return dict(message="Successfully fetched auth token", data=user), 200
            except Exception as e:
                return dict(message="Failed to issue an authorization token", error=str(e), data=None), 500

        # user == None:
        return dict(message="Invalid credentials", data=None, error="Unauthorized"), 401

    except Exception as e:
        return dict(message="Something went wrong", error=str(e), data=None), 500
