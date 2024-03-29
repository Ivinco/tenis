import os, atexit, jsonschema, jwt, threading
from datetime import datetime, timezone, timedelta
import pymongo
from bson.objectid import ObjectId
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from flask_socketio import SocketIO, emit, send, disconnect
from apscheduler.schedulers.background import BackgroundScheduler
from werkzeug.exceptions import HTTPException, Unauthorized, BadRequest, InternalServerError
import json
from .auth import create_token, token_required, token_required_ws
from .user import User
from .alert import load_alerts, lookup_alert, update_alerts, make_history_entry, is_resolved

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
app.config['HISTORY_RETENTION_DAYS'] = 30
app.config['HISTORY_PERIOD_MINUTES'] = 15
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
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


# Internal periodic tasks
scheduler = BackgroundScheduler()
def db_retention():
    """ Delete old history entries.
        Also, make intermediate record for each active alert in the DB to history table - needed for reports generation. """
    print("Starting DB history retention background process...")
    try:
        cutoff = now = datetime.now(timezone.utc) - timedelta(days=app.config['HISTORY_RETENTION_DAYS'])
        app.db['history'].delete_many({'logged': {'$lte': cutoff}})
    except pymongo.errors.PyMongoError as e:
        print("Warning: DB retention task failed: %s" % e)
        pass

    print("Dumping active alerts history...")
    history_entries = []
    with alerts_lock:
        for a in alerts:
            history_entries.append(make_history_entry(a))
        if history_entries:
            try:
                app.db['history'].insert_many(history_entries)
            except pymongo.errors.PyMongoError as e:
                print("Warning: failed to save history data: %s" % e)
                pass
    print("Periodic DB routine finished")
    return


job = scheduler.add_job(db_retention, 'interval', minutes=app.config['HISTORY_PERIOD_MINUTES'])
scheduler.start()


# JSON schema to validate inbound JSON
schema = {
    "definitions": {
        "custom_field_definition": {
            "type": "object",
            "additionalProperties": {
                "type": "string"
            }
        },
        "new_alert_definition": {
            "properties": {
                "project": {"type": "string", "maxLength": 255},
                "host": {"type": "string", "maxLength": 255},
                "fired": {"type": "integer"},
                "alertName": {"type": "string", "maxLength": 1024},
                "severity": {"type": "string", "maxLength": 255},
                "msg": {"type": "string", "maxLength": 65536},
                "responsibleUser": {"type": "string", "maxLength": 1024},
                "comment": {"type": "string", "maxLength": 65536},
                "silenced": {"type": "boolean"},
                "customFields": {"type": "object", "$ref": "#/definitions/custom_field_definition"}
            },
            "anyOf": [
                {"required": ["project", "host", "fired", "alertName", "severity", "msg", "responsibleUser", "comment", "silenced"]},
                {"required": ["project", "host", "fired", "alertName", "severity", "msg", "responsibleUser", "comment", "silenced", "customFields"]}
            ],
            "additionalProperties": False
        },
        "resolved_alert_definition": {
            "properties": {
                "project": {"type": "string"},
                "host": {"type": "string"},
                "alertName": {"type": "string"},
            },
            "required": ["project", "host", "alertName"],
            "additionalProperties": False
        },
        "ack_definition": {
            "properties": {
                "alertId": {"type": "string"},
            },
            "required": ["alertId"],
            "additionalProperties": False
        },
    },


    "type": "object",  # this is for the root element
    "anyOf": [
        {"required": ["update"]},
        {"required": ["reload"]},
        {"required": ["resolve"]},
        {"required": ["unack"]},
        {"required": ["ack"]},
    ],
    "properties": {
        "update": {
            "type": "array",
            "maxItems": 10000,
            "items": {"$ref": "#/definitions/new_alert_definition"}
        },
        "resolve": {
            "type": "array",
            "maxItems": 10000,
            "items": {"$ref": "#/definitions/resolved_alert_definition"}
        },
        "unack": {
            "type": "array",
            "maxItems": 10000,
            "items": {"$ref": "#/definitions/ack_definition"}
        },
        "ack": {
            "type": "array",
            "maxItems": 10000,
            "items": {"$ref": "#/definitions/ack_definition"}
        },
        "reload": {
            "type": "boolean"
        },
    },
    "additionalProperties": False
}

# JSON schema to validate inbound silence JSON
silence_schema = {
    "anyOf": [
        {"required": ["hostName"]},
        {"required": ["alertName"]},
        {"required": ["startSilence"]},
        {"required": ["endSilence"]},
        {"required": ["comment"]},
    ],
    "properties": {
        "hostName": {
            "type": "string",
            "maxLength": 255
        },
        "alertName": {
            "type": "string",
            "maxLength": 255
        },
        "startSilence": {
            "type": "integer"
        },
        "endSilence": {
            "type": ["integer", "null"]
        },
        "comment": {
            "type": "string",
            "maxLength": 255
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
@token_required()  # note () are required!
def whoami(user):
    """ 
    Method that just returns user's email
    We use @token_required with no parameters, this is enough to make sure the user is authenticated
    """
    resp = make_response(jsonify(user=user))
    return resp, 200


@app.route('/ack', methods=['POST'])
@token_required()  # note () are required!
def ack(user):
    """
    Method to set or unset responsibleUser for alerts
    """
    try:
        data = request.json
        jsonschema.validate(instance=data, schema=schema)
    except jsonschema.exceptions.ValidationError as e:
        raise BadRequest(e.message)

    ack_user = user['email']
    updated_alerts = []  # list of updated alerts
    update_alerts_query = []  # list to hold MongoDB query to update 'current' collection
    if 'ack' in data:
        for item in data['ack']:
            for alert in alerts:
                ack_id = ObjectId(item['alertId'])
                if ack_id == alert['_id']:
                    alert['responsibleUser'] = ack_user
                    updated_alerts.append(alert)
                    update_alerts_query.append(pymongo.UpdateOne({'_id': alert['_id']}, {"$set": {"responsibleUser": ack_user}}))
                    break

    if 'unack' in data:
        for item in data['unack']:
            for alert in alerts:
                ack_id = ObjectId(item['alertId'])
                if ack_id == alert['_id']:
                    alert['responsibleUser'] = ''
                    updated_alerts.append(alert)
                    update_alerts_query.append(pymongo.UpdateOne({'_id': alert['_id']}, {"$set": {"responsibleUser": ''}}))
                    break

    if updated_alerts:
        try:
            app.db['current'].bulk_write(update_alerts_query)
            socketio.emit('update', parse_json(updated_alerts))
        except pymongo.errors.PyMongoError as e:
            raise InternalServerError("Failed to save alerts in MongoDB: %s" % e)
        except socketio.exceptions.SocketIOError as e:
            print("Warning: Failed to send update to connected socket.io clients: %s" % e)
            pass

    return "OK", 200


@app.route('/silence', methods=['POST'])
@token_required()  # note () are required!
def silence(user):
    """
    Method to add silencers
    """
    try:
        data = request.json
        jsonschema.validate(instance=data, schema=silence_schema)
    except jsonschema.exceptions.ValidationError as e:
        raise BadRequest(e.message)

    silence_user = user['email']
    data["author"] = silence_user
    try:
        app.db['silence'].insert_one(data)
    except pymongo.errors.PyMongoError as e:
        raise InternalServerError("Failed to save silencer in MongoDB: %s" % e)

    return "OK", 200


@app.route('/silenced', methods=['GET'])
@token_required()  # note () are required!
def silenced(user):
    """
    Method to return a list(json) of 'silence' objects
    """

    silence_list = ()
    try:
        with alerts_lock:
            silence_list = load_alerts(app.db['silence'])
    except pymongo.errors.PyMongoError as e:
        raise InternalServerError("Failed to read silence table from MongoDB: %s" % e)
    if silence_list:
        for item in silence_list:
            item["_id"] = str(item["_id"])

    return json.dumps(silence_list), 200


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

    if 'update' in data:
        with alerts_lock:
            new_alerts = [] # list of new alerts
            updated_alerts = [] # list of updated alerts
            update_alerts_query = [] # list to hold MongoDB query to update 'current' collection
            new_history_entries = [] # list of entries to add to 'history' collection
            for a in data['update']:
                if is_resolved(a): continue # do not process resolved alerts in 'update' section

                existing_alert = lookup_alert(alerts, a)
                if existing_alert is None: # new alert
                    new_alerts.append(a)
                    continue # next 'a' from data['update]', please

                existing_alert = existing_alert.copy() # we will update global list later

                # if severity changed, this should be logged to history collection
                if existing_alert['severity'] != a['severity']:
                    a['_id'] = existing_alert['_id']
                    new_history_entries.append(make_history_entry(a))

                # found this alert in global list, maybe alert attributes have changed?
                new_attributes = {}
                for attr in ['fired', 'severity', 'msg', 'responsibleUser', 'comment', 'silenced', 'customFields']:
                    if existing_alert[attr] != a[attr]:  # works OK even for dicts (e.g. 'customFields' is a dict)
                        new_attributes[attr] = a[attr]   # to be saved in DB
                        existing_alert[attr] = a[attr]   # note this won't affect the global list since existing_alert is a copy
                if new_attributes:
                    update_alerts_query.append(pymongo.UpdateOne({'_id': existing_alert['_id']}, {"$set": new_attributes}))
                    updated_alerts.append(existing_alert)

            if not new_alerts and not updated_alerts:  # all submitted alerts are already in the system
                return 'OK', 200

            if new_alerts:
                try:
                    res = app.db['current'].insert_many(new_alerts)
                    for i, _id in enumerate(res.inserted_ids):
                        new_alerts[i]['_id'] = _id
                        new_history_entries.append(make_history_entry(new_alerts[i]))
                    alerts.extend(new_alerts)
                    # note that socketio.emit can be only done after insert_many:
                    # we need Mongo to give us inserted object _ids
                    socketio.emit('update', parse_json(new_alerts))
                except pymongo.errors.PyMongoError as e:
                    raise InternalServerError("Failed to save alerts in MongoDB: %s" % e)
                except socketio.exceptions.SocketIOError as e:
                    print("Warning: Failed to send update to connected socketio clients: %s" % e)
                    pass

            if updated_alerts:
                try:
                    app.db['current'].bulk_write(update_alerts_query)
                    for a in updated_alerts:
                        update_alerts(alerts, a)
                    socketio.emit('update', parse_json(updated_alerts))
                except pymongo.errors.PyMongoError as e:
                    raise InternalServerError("Failed to save alerts in MongoDB: %s" % e)
                except socketio.exceptions.SocketIOError as e:
                    print("Warning: Failed to send update to connected socketio clients: %s" % e)
                    pass

        # history can be updated outside of alerts_lock: it's write_only
        if new_history_entries:
            try:
                app.db['history'].insert_many(new_history_entries)
            except pymongo.errors.PyMongoError as e:
                print("Warning: failed to save history data: %s" % e)
                pass
        return 'OK', 200

    if 'resolve' in data:
        resolved_alerts = []
        resolved_ids = []
        resolved_history_entries = []
        with alerts_lock:
            for entry in data['resolve']:
                a = lookup_alert(alerts, entry)
                if a is None: continue # we don't have this alert in the global list, skip
                resolved_alerts.append(a)
                a['severity'] = 'RESOLVED'
                resolved_history_entries.append(make_history_entry(a))
                resolved_ids.append(a['_id'])

            if len(resolved_alerts) == 0:
                return 'OK', 200  # submitted alerts list does not match a single alert from the global list

            for a in resolved_alerts:
                alerts.remove(a) # remove from global in-mem list

            try:
                app.db['current'].delete_many({'_id': {'$in': resolved_ids}})
            except pymongo.errors.PyMongoError as e:
                raise InternalServerError("Failed to save alerts in MongoDB: %s" % e)
            try:
                socketio.emit('resolve', parse_json(resolved_ids))
            except socketio.exceptions.SocketIOError as e:
                print("Warning: Failed to send update to connected socketio clients: %s" % e)
                pass

        # History can be updated outside of alerts_lock since it's write only
        try:
            app.db['history'].insert_many(resolved_history_entries)
        except pymongo.errors.PyMongoError as e:
            print("Warning: failed to save history data: %s" % e)
            pass
        return 'OK', 200

    if 'reload' in data:
        with alerts_lock:
            try:
                alerts = load_alerts(app.db['current'])
                socketio.emit('init', parse_json(alerts))
            except pymongo.errors.PyMongoError as e:
                raise InternalServerError("Failed to load alerts from MongoDB: %s" % e)
            except socketio.exceptions.SocketIOError as e:
                print("Warning: Failed to send update to connected socketio clients: %s" % e)
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
def on_connect(user, data = None):
    global alerts
    with alerts_lock:
        emit('init', parse_json(alerts))
