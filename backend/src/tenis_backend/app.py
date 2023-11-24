import os
import jwt
import atexit
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from flask_socketio import SocketIO, emit, send
from werkzeug.exceptions import Unauthorized, BadRequest, InternalServerError
from .auth import create_token, token_required, token_required_ws
from .user import User


# Global vars init
app = Flask(__name__)
CORS(app, supports_credentials=True)
socketio = SocketIO(app, cors_allowed_origins="https://tenis-dev.k8s-test.ivinco.com")

# App configuration parameters
mongo_host = os.getenv('MONGO_HOST', 'localhost')  # Default to 'localhost' if not set
mongo_dbname = os.getenv('MONGO_DBNAME', 'tenis')  # Default to 'database' if not set
connection_string = f"mongodb://{mongo_host}/{mongo_dbname}"
app.mongodb_client = MongoClient(connection_string)
app.db = app.mongodb_client[mongo_dbname]
app.config['SECRET_KEY'] = os.getenv('SECRET', 'big-tenis')
app.config['LISTEN_PORT'] = os.getenv('LISTEN_PORT', '8000')
app.config['LISTEN_HOST'] = os.getenv('LISTEN_HOST', '0.0.0.0')
#
# This can be useful for testing
#app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(minutes=1)
#app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(minutes=5)
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)

def cleanup_on_shutdown():
    """Properly close MongoDB connection on shutdown"""
    app.mongodb_client.close()
atexit.register(cleanup_on_shutdown)


#
# API handles
#
@app.route('/')
def index():
    return "Hello, world!\n", 200


@app.route('/whoami')
@token_required() # note () are required!
def whoami(user):
    """ 
    Method that just returns user's email
    We use @token_required with no parameters, this is enough to make sure the user is authenticated
    """
    resp = make_response(jsonify(user=user))
    return resp, 200


@app.route('/healz')
def healz():
    try:
        app.db.command('ping')
    except Exception as e:
        return f"Mongo error: {e!r}\n", 500
    return "tenis is big as ever\n", 200


@app.route('/auth', methods=['POST'])
def login():
    """ Authenticate, get two tokens """
    data = request.get_json(force=True, silent=False)
    if not data:
        raise BadRequest("Please provide user credentials in JSON format")

    user = User().login(
        data.get('email'),
        data.get('password')
    )
    if not user:
        raise Unauthorized("Invalid credentials")

    try:
        now = datetime.now(timezone.utc)
        acccess_token_expires = now + app.config['JWT_ACCESS_TOKEN_EXPIRES']
        refresh_token_expires = now + app.config['JWT_REFRESH_TOKEN_EXPIRES']
        
        access_token = create_token(user['_id'], app.config['SECRET_KEY'], 'access', acccess_token_expires)
        refresh_token = create_token(user['_id'], app.config['SECRET_KEY'], 'refresh', refresh_token_expires)
        resp = make_response(jsonify(access_token=access_token, user=user))
        # httponly means 'cookie is not available for JS code in the browser'
        resp.set_cookie('refresh_token', refresh_token, secure=False, httponly=True, expires=refresh_token_expires)
        return resp, 200
    except Exception as e:
        raise InternalServerError("Failed to create JWT token")


# We are using the `refresh=True` options in jwt_required to only allow
# refresh tokens to access this route.
# Note that refresh=True also changes @token_required behavior: it looks for refresh token
# in cookie called 'refresh_token', not in Authorization header
@app.route('/refresh')
@token_required(refresh=True)
def refresh(user):
    try:
        now = datetime.now(timezone.utc)
        acccess_token_expires = now + app.config['JWT_ACCESS_TOKEN_EXPIRES']
        refresh_token_expires = now + app.config['JWT_REFRESH_TOKEN_EXPIRES']

        access_token = create_token(user['_id'], app.config['SECRET_KEY'], 'access', acccess_token_expires)
        refresh_token = create_token(user['_id'], app.config['SECRET_KEY'], 'refresh', refresh_token_expires)
        resp = make_response(jsonify(access_token=access_token))
        resp.set_cookie('refresh_token', refresh_token, secure=False, httponly=True, expires=refresh_token_expires)
        return resp, 200
    except Exception as e:
        raise InternalServerError("Failed to issue refresh token")


#
# Websocket channels
#
@socketio.on('connect')
def test_connect(auth):
    print("Connected")
    emit('my response', {'data': 'Connected'})

@socketio.on('disconnect')
def disconnect():
    print('Disconnected')
# @token_required_ws
# def handle_message(data):
#     json = """ [
#                 {
#                     "id": "u0ToONntLn2m4NA2",
#                     "project": "Ivinco",
#                     "host": "crawl-farm-vm-worker12",
#                     "fired": "1622686004",
#                     "alertName": "Host is unavailable",
#                     "severity": "CRITICAL",
#                     "msg": "kubelet on crawl-farm-vm-worker2.sgdctroy.net(192.168.5.219) got more than 100 errors per 5min",
#                     "responsibleUser": "",
#                     "comment": "",
#                     "isScheduled": "false",
#                     "customFields": {
#                         "FixInstructions": "https://wiki.ivinco.com/prj/intranet#mnu",
#                         "labels": "label 3, label 1, label 7, label 7",
#                         "grafanaLink": "https://grafana.sgdctroy.net/d/vYIh9K9Mzss/redis?orgId=1&refresh=30s"
#                     }
#                 }
#                ]"""
#     emit('init', json, json=True)
