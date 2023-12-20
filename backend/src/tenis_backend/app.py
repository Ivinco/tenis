import os, atexit, jsonschema, jwt, threading
from datetime import datetime, timezone, timedelta
import pymongo
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from flask_socketio import SocketIO, emit, send, disconnect
from werkzeug.exceptions import HTTPException, Unauthorized, BadRequest, InternalServerError
import json
from .auth import create_token, token_required, token_required_ws
from .user import User
from .alert import load_alerts, lookup_alert

# Global vars init
app = Flask(__name__)
CORS(app, supports_credentials=True)
socketio = SocketIO(app, cors_allowed_origins="*")

# App configuration parameters
mongo_host = os.getenv('MONGO_HOST', 'localhost')  # Default to 'localhost' if not set
mongo_dbname = os.getenv('MONGO_DBNAME', 'tenis')  # Default to 'database' if not set
connection_string = f"mongodb://{mongo_host}/{mongo_dbname}"
app.mongodb_client = pymongo.MongoClient(connection_string)
app.db = app.mongodb_client[mongo_dbname]
app.config['SECRET_KEY'] = os.getenv('SECRET', 'big-tenis')
app.config['LISTEN_PORT'] = os.getenv('LISTEN_PORT', '8000')
app.config['LISTEN_HOST'] = os.getenv('LISTEN_HOST', '0.0.0.0')
app.config['API_TOKEN'] = os.getenv('API_TOKEN', 'asdfg')
#
# This can be useful for testing
#app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(minutes=1)
#app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(minutes=5)
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)

# Load alerts from the DB
alerts_lock = threading.Lock()
alerts = list()
with alerts_lock:
    alerts = load_alerts(app.db['current'])

# JSON schema to validate inbound JSON
schema = {
    "definitions": {
        "custom_field_definition": {
            "additionalProperties": True,
        },
        "new_alert_definition": {
            "properties": {
                "project": { "type": "string" },
                "host": { "type": "string" },
                "fired": { "type": "integer" },
                "alertName": { "type": "string" },
                "severity": { "type": "string" },
                "msg": { "type": "string" },
                "responsibleUser": { "type": "string" },
                "comment": { "type": "string" },
                "isScheduled": { "type": "boolean" },
                "customFields": { "type": "object", "$ref": "#/definitions/custom_field_definition" }
            },
            "anyOf": [
                {"required": [ "project", "host", "fired", "alertName", "severity", "msg", "responsibleUser", "comment", "isScheduled" ]},
                {"required": [ "project", "host", "fired", "alertName", "severity", "msg", "responsibleUser", "comment", "isScheduled", "customFields" ]}
            ],
            "additionalProperties": False
        },
        "resolved_alert_definition": {
            "properties": {
                "project": { "type": "string" },
                "host": { "type": "string" },
                "alertName": { "type": "string" },
            },
            "required": [ "project", "host", "alertName" ],
            "additionalProperties": False
        }
    },


    "type": "object", # this is for the root element
    "oneOf": [ {"required": ["update"]}, {"required": ["resolve"]}, {"required": ["update", "resolve"]}, {"required": ["reload"]} ],
    "properties": {
        "update": {
            "type": "array",
            "maxItems": 10000,
            "items": { "$ref": "#/definitions/new_alert_definition" }
        },
        "resolve": {
            "type": "array",
            "maxItems": 10000,
            "items": { "$ref": "#/definitions/resolved_alert_definition" }
        },
        "reload": {
            "type": "boolean"
        }
    },
    "additionalProperties": False
}

def cleanup_on_shutdown():
    """Properly close MongoDB connection on shutdown"""
    app.mongodb_client.close()
atexit.register(cleanup_on_shutdown)


def parse_json(data):
    """ Parse Mongo's OIDs """
    return json.dumps(data, default=str)

#
# API handles
#
@app.errorhandler(HTTPException)
def handle_exception(e):
    """Return JSON instead of HTML for HTTP errors"""
    # start with the correct headers and status code from the error
    response = e.get_response()
    # replace the body with JSON
    response.data = json.dumps({
        "code": e.code,
        "name": e.name,
        "description": e.description,
    })
    response.content_type = "application/json"
    return response


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


@app.route('/in', methods=['POST'])
def inbound():
    """ Inbound API calls to inject alerts and updates """
    global alerts

    # This is separate from the frontend auth - just standard API token check
    try:
        token = request.headers['X-Tenis-Token']
    except Exception:
        raise Unauthorized("Missing API token")
    if token != app.config['API_TOKEN']:
        raise Unauthorized("Invalid API token")

    try:
        data = request.json
        jsonschema.validate(instance=data, schema=schema)
    except jsonschema.exceptions.ValidationError as e:
        raise BadRequest(e.message)


    alerts_collection = app.db['current']

    # history_collection = app.db['history']
    if 'update' in data:
        with alerts_lock:
            new_alerts = []
            for a in data['update']:
                    if lookup_alert(alerts, a): continue # we already have this alert in global alerts list
                    new_alerts.append(a)

            if len(new_alerts) == 0: # all submitted alerts are already in the system
                return 'OK', 200

            try:
                res = alerts_collection.insert_many(new_alerts)
                for i, _id in enumerate(res.inserted_ids):
                    new_alerts[i]['_id'] = _id
                # TODO: update history_collection here
            except pymongo.errors.PyMongoError as e:
                raise InternalServerError(e)

            # If DB write was successful, update global alerts list
            for a in new_alerts:
                alerts.append(a)

        try:
            # Send broadcast event to all connected clients
            socketio.emit('update', parse_json(new_alerts))
        except Exception: pass # Don't blame the reporter if backend failed to update clients
        return 'OK', 200

    if 'resolve' in data:
        resolved_alerts = []
        resolved_ids = []
        with alerts_lock:
            for entry in data['resolve']:
                a = lookup_alert(alerts, entry)
                if a is None: continue # we don't have this alert in the global list, skip
                resolved_alerts.append(a)
                resolved_ids.append(a['_id'])
            if len(resolved_alerts) == 0:
                return 'OK', 200 # submitted alerts list does not match a single alert from the global list

            try:
                alerts_collection.delete_many({'_id': {'$in': resolved_ids}})
                # TODO: update history_collection here
            except pymongo.errors.PyMongoError as e:
                raise InternalServerError(e)

            # If DB write was successful, remove resolved alerts from the global list
            for a in resolved_alerts:
                alerts.remove(a)

        try:
            socketio.emit('resolve', parse_json(resolved_ids))
        except Exception: pass # Don't blame the reporter if backend failed to update clients
        return 'OK', 200

    if 'reload' in data:
        with alerts_lock:
            alerts = load_alerts(app.db['current'])
            # TODO: decided what to do with history_collection
        try:
            socketio.emit('init', parse_json(alerts))
        except Exception: pass # don't blame the reporter if backend failed to update clients
        return 'OK', 200

    # not reached
    raise InternalServerError('Bug in JSON validation schema')


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
@token_required_ws
def on_connect(user, data = None):
    global alerts
    with alerts_lock:
        emit('init', parse_json(alerts))
