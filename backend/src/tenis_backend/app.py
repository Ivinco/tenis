import os, atexit, jsonschema, jwt
from datetime import datetime, timezone, timedelta
import pymongo
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from flask_socketio import SocketIO, emit, send, disconnect
from werkzeug.exceptions import Unauthorized, BadRequest, InternalServerError
import json
from .auth import create_token, token_required, token_required_ws
from .user import User


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

# JSON schema to validate inbound JSON
schema = {
    "definitions": {
        "custom_field_definition": {
            "properties": {
                "fixInstructions": { "type": "string" },
                "labels": { "type": "string" }, # XXX: change to array
                "grafanaLink": { "type": "string" }
            },
            # XXX: fix the validation
            #"anyOf": [ "fixInstructions", "labels", "grafanaLink" ],
            #"additionalProperties": False
        },
        "alert_definition": {
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
            "required": [
                "project", "host", "fired", "alertName", "severity", "msg", "responsibleUser", "comment", "isScheduled"
            ],
            "additionalProperties": False
        }
    },


    "type": "object", # this is for the root element
    "oneOf" : [{"required": ["new"]}, {"required": ["resolved"]}, {"required": ["new", "resolved"]} ],
    "properties": {
        "new": {
            "type": "array",
            "maxItems": 10000,
            "items": { "$ref": "#/definitions/alert_definition" }
        },
        "resolved": {
            "type": "array",
            "maxItems": 10000,
            "items": { "$ref": "#/definitions/alert_definition" }
        },
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
    #XXX: history_collection = app.db['history']
    if 'new' in data:
        print(data['new'])
        try:
            alerts_collection.insert_many(data['new'])
            # XXX: update history_collection here
        except pymongo.errors.PyMongoError as e:
            raise InternalServerError(e)
        try:
            # Send broadcast event to all connected clients
            socketio.emit('update', data['new'], json=True);
        except Exception:
            # Don't blame the reporter if backend failed to update clients
            pass
        return 'OK', 200

    if 'resolved' in data:
        try:
            for alert in data['resolved']:
                query = { "alertName": alert["alertName"], "host": alert["host"] }
                alerts_collection.delete_one(query)
                # XXX: update history_collection here
        except pymongo.errors.PyMongoError as e:
            raise InternalServerError(e)
        try:
            socketio.emit('resolve', data['resolved'], json=True);
        except Exception:
            # Again, Don't blame the reporter if backend failed to update clients
            pass
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
def on_connect(user = None, data = None):
    alerts = []
    try:
        col = app.db['current']
        for alert in col.find({}):
            alerts.append(alert)
    except pymongo.errors.PyMongoError as e:
        disconnect() # can't do anything here if Mongo query fails
    emit('init', parse_json(alerts), json=True)
