import atexit
import json
import jsonschema
import os
import re
import threading
import pymongo

from datetime import datetime, timezone, timedelta
from bson.objectid import ObjectId
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from flask_socketio import SocketIO, emit, send, disconnect
from apscheduler.schedulers.background import BackgroundScheduler
from email_validator import validate_email, EmailNotValidError
from werkzeug.exceptions import HTTPException, Unauthorized, BadRequest, InternalServerError

from .alert import load_alerts, lookup_alert, update_alerts, regexp_alerts, make_history_entry, is_resolved
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
app.config['HISTORY_RETENTION_DAYS'] = 30
app.config['HISTORY_PERIOD_MINUTES'] = 15
app.config['SILENCE_PERIOD_SECONDS'] = 10  # Silence rules check interval, checks that endSilence is <= current time
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
#
# This can be useful for testing
#app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(minutes=1)
#app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(minutes=5)
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)

# Load alerts from the DB
alerts_lock = threading.Lock()
with alerts_lock:
    alerts = load_alerts(app.db['current'])


# Internal periodic tasks via BackgroundScheduler
def silence_scheduler():
    """
    Check if silence period is over
    """
    unsilence_list = []
    silence_rules = list(app.db['silence'].find({}))
    if silence_rules:
        ts = datetime.now().timestamp()
        for rule in silence_rules:
            if rule['endSilence'] and rule['endSilence'] <= ts:
                unsilence_list.append(rule)
    if unsilence_list:
        unsilence_matched_alerts(unsilence_list)


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


scheduler = BackgroundScheduler()
job = scheduler.add_job(db_retention, 'interval', minutes=app.config['HISTORY_PERIOD_MINUTES'])
job2 = scheduler.add_job(silence_scheduler, 'interval', seconds=app.config['SILENCE_PERIOD_SECONDS'])
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
        "unsilence_definition": {
            "properties": {
                "silenceId": {"type": "string"},
            },
            "required": ["silenceId"],
            "additionalProperties": False
        },
    },


    "type": "object",  # this is for the root element
    "anyOf": [
        {"required": ["unsilence"]},
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
        "unsilence": {
            "type": "array",
            "maxItems": 10000,
            "items": {"$ref": "#/definitions/unsilence_definition"}
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
    "required": [
        "project",
        "host",
        "alertName",
        "startSilence",
        "endSilence",
        "comment",
    ],
    "properties": {
        "project": {
            "type": "string",
            "maxLength": 255
        },
        "host": {
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


def send_alerts(updated_alerts, update_alerts_query):
    """
    Function to send updated alerts to clients and update DB
    Used in /ack, /silence POST methods and in unsilence_matched_alerts function(/unsilence POST method)

    :param updated_alerts: List of updated alerts to send
    :param update_alerts_query: Queries to update DB
    :return: nothing
    """
    if updated_alerts:
        try:
            socketio.emit('update', parse_json(updated_alerts))
        except socketio.exceptions.SocketIOError as e:
            raise InternalServerError("Warning: Failed to send update to connected socket.io clients: %s" % e)

    if update_alerts_query:
        try:
            app.db['current'].bulk_write(update_alerts_query)
        except pymongo.errors.PyMongoError as e:
            raise InternalServerError("Failed to save alerts in MongoDB: %s" % e)


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

    send_alerts(updated_alerts, update_alerts_query)
    return "OK", 200


@app.route('/silence', methods=['POST'])
@token_required()  # note () are required!
def silence(user):
    """
    Method to add silence rule and set 'silenced' field of all matched alerts to True
    """
    try:
        data = request.json
        jsonschema.validate(instance=data, schema=silence_schema)
    except jsonschema.exceptions.ValidationError as e:
        raise BadRequest(e.message)

    if not data['project'] and not data['alertName'] and not data['host']:
        raise InternalServerError("Too broad regex pattern")

    ts = datetime.now().timestamp()
    silence_rule = {
        "project": re.escape(data['project']),
        "host": re.escape(data['host']),
        "alertName": re.escape(data['alertName']),
        "startSilence": data['startSilence'],
        "endSilence": data['endSilence'],
        "comment": re.escape(data['comment'])
    }

    if silence_rule['endSilence'] and silence_rule['endSilence'] <= ts:
        return "Too late :) endSilence time has passed already", 200

    # this part is needed to make re.escape explicitly for regexp_alerts function to pass CodeQL check
    project = re.escape(data['project'])
    alert = re.escape(data['alertName'])
    host = re.escape(data['host'])
    search_pattern = {
        "alertName": alert,
        "project": project,
        "host": host
    }

    updated_alerts = []  # list of updated alerts
    update_alerts_query = []  # list to hold MongoDB query to update 'current' collection
    matched_alerts = regexp_alerts(alerts, search_pattern)

    if matched_alerts:
        for alert in matched_alerts:
            alert["silenced"] = True
            alert["comment"] = data["comment"]
            updated_alerts.append(alert)
            update_alerts_query.append(pymongo.UpdateOne(
                {'_id': alert['_id']}, {"$set": {"silenced": True, "comment": data["comment"]}})
            )

    silence_user = user['email']
    silence_rule["author"] = silence_user
    try:
        app.db['silence'].insert_one(silence_rule)
    except pymongo.errors.PyMongoError as e:
        raise InternalServerError("Failed to save silencer in MongoDB: %s" % e)

    send_alerts(updated_alerts, update_alerts_query)
    return "OK", 200


def unsilence_matched_alerts(silence_rules):
    """
    Function is used in /unsilence POST method and in background silence_scheduler
    :param silence_rules: List of silence rules to check
    :return: Nothing
    """
    updated_alerts = []  # list of updated alerts
    delete_rule_query = []  # list to hold MongoDB query to delete from 'silence' collection
    update_alerts_query = []  # list to hold MongoDB query to update 'current' collection
    for item in silence_rules:
        delete_rule_query.append(pymongo.DeleteOne({'_id': item['_id']}))
        matched_alerts = regexp_alerts(alerts, item)
        if matched_alerts:
            for alert in matched_alerts:
                alert["silenced"] = False
                alert["comment"] = ""
                updated_alerts.append(alert)
                update_alerts_query.append(pymongo.UpdateOne(
                    {'_id': alert['_id']}, {"$set": {"silenced": False, "comment": ""}})
                )

    try:
        app.db['silence'].bulk_write(delete_rule_query)
    except pymongo.errors.PyMongoError as e:
        raise InternalServerError("Failed to delete silence rules from MongoDB: %s" % e)

    send_alerts(updated_alerts, update_alerts_query)


@app.route('/unsilence', methods=['POST'])
@token_required()  # note () are required!
def unsilence(user):
    """
    Method to remove silence rule(s) and set 'silenced' field of all matched alerts to False
    """
    try:
        data = request.json
        jsonschema.validate(instance=data, schema=schema)
    except jsonschema.exceptions.ValidationError as e:
        raise BadRequest(e.message)

    obj_id_list = [ObjectId(item['silenceId']) for item in data['unsilence']]

    try:
        silence_rules = list(app.db['silence'].find({'_id': {'$in': obj_id_list}}))
    except pymongo.errors.PyMongoError as e:
        raise InternalServerError("Failed to retrieve silence rules from MongoDB: %s" % e)

    unsilence_matched_alerts(silence_rules)
    return "OK", 200


@app.route('/silenced', methods=['GET'])
@token_required()  # note () are required!
def silenced(user):
    """
    Method to return a json list of 'silence' rules
    """
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


@app.route('/users')
@token_required()
def get_users(current_user):
    """Return list of all users"""
    try:
        users = User().get_all()
        return jsonify(users), 200
    except Exception as e:
        raise InternalServerError(f"Failed to retrieve users: {str(e)}")

@app.route('/user', methods=['POST'])
@token_required()
def get_user_by_id(current_user):
    """Return user by id"""
    data = request.get_json(force=True, silent=False)
    if not data or 'id' not in data:
        return make_response(jsonify({"error": "Please provide user ID in JSON format"}), 400)
    try:
        user_id = data.get('id')
        user = User().get_by_id(user_id)
        if not user:
            return make_response(jsonify({"error": "User not found"}), 404)
        return jsonify(user), 200
    except Exception as e:
        raise InternalServerError(f"Failed to retrieve user: {str(e)}")


@app.route('/user/get_by_email', methods=['POST'])
@token_required()
def get_user_by_email(current_user):
    """Return user by email"""
    data = request.get_json()
    if not data or 'email' not in data:
        return make_response(jsonify({"error": "Please provide email in JSON format"}), 400)
    try:
        email = data['email']
        user = User().get_by_email(email)
        if not user:
            return make_response(jsonify({"error": "User not found"}), 404)
        return jsonify(user), 200
    except Exception as e:
        raise InternalServerError(f"Failed to retrieve user: {str(e)}")


@app.route('/user/add', methods=['POST'])
@token_required()  # note () are required!
def add_user(current_user):
    """Create new User"""
    data = request.get_json()

    if not data or 'email' not in data or 'password' not in data:
        return make_response(jsonify({"error": "Email and password are required"}), 400)
    
    try:
        # email validation
        valid_email = validate_email(data['email']).email
    except EmailNotValidError as e:
        return make_response(jsonify({"error": "Invalid email"}), 400)

    email = valid_email # required
    name = data.get('name', "") # optional
    password = data.get('password') # required
    avatar = data.get('avatar', "")

    # Is it should be in mongo ? 
    grouping = data.get('grouping', False) # optional 
    timezone = data.get('timezone', "Browser") # optional 
    projects = data.get('projects', "All") # optional

    phone = data.get('phone', "") # optional 
    active = data.get('active', True) # optional
    is_admin = data.get('is_admin', True) # optional 

    try:
        user = User().create(name, email, password, avatar, grouping, timezone, projects, phone)
        if user is None:
            return make_response(jsonify({"error": "User with this email already exists"}), 409)  # Конфликт
        return jsonify(user), 201  
    except Exception as e:
        return make_response(jsonify({"error": str(e)}), 500)


@app.route('/user/del', methods=['POST'])
@token_required() 
def del_user(current_user):
    """Removing user with id"""
    data = request.get_json()
    
    if not data or 'id' not in data:
        return make_response(jsonify({"error": "Please provide id in JSON format"}), 400)
    
    user_id = data['id']
    
    try:
        valid_id = ObjectId(user_id)
    except:
        return make_response(jsonify({"error": "Invalid ID format"}), 400)

    try:
        result = User().delete(user_id)
        if result is False:
            return make_response(jsonify({"error": "User not found"}), 404)
        return jsonify({"message": "User deleted successfully"}), 200
    except Exception as e:
        return make_response(jsonify({"error": str(e)}), 500)

@app.route('/user/disable', methods=['POST'])
@token_required() 
def disable_user(current_user):
    """Disable user by id"""
    data = request.get_json()
    
    if not data or 'id' not in data:
        return make_response(jsonify({"error": "Please provide id in JSON format"}), 400)
    
    user_id = data['id']
    
    try:
        valid_id = ObjectId(user_id)
    except:
        return make_response(jsonify({"error": "Invalid ID format"}), 400)
    
    try:
        result = User().disable_account(user_id)
        if result is False:
            return make_response(jsonify({"error": "User not found"}), 404)
        return jsonify({"message": "User disabled successfully"}), 200
    except Exception as e:
        return make_response(jsonify({"error": str(e)}), 500)

@app.route('/user/enable', methods=['POST'])
@token_required() 
def enable_user(current_user):
    """Enable user by id"""
    data = request.get_json()
    
    if not data or 'id' not in data:
        return make_response(jsonify({"error": "Please provide id in JSON format"}), 400)
    
    user_id = data['id']
    
    try:
        valid_id = ObjectId(user_id)
    except:
        return make_response(jsonify({"error": "Invalid ID format"}), 400)
    
    try:
        result = User().enable_account(user_id)
        if result is False:
            return make_response(jsonify({"error": "User not found"}), 404)
        return jsonify({"message": "User disabled successfully"}), 200
    except Exception as e:
        return make_response(jsonify({"error": str(e)}), 500)

@app.route('/user/update', methods=['POST'])
@token_required() 
def update_user(current_user):
    """Update user data"""
    data = request.get_json()

    if not data or 'id' not in data:
        user_id = current_user['_id']
    else:
        user_id = data['id']
        data.pop('id')  # removing ID from data

    try:
        valid_id = ObjectId(user_id)
    except:
        return make_response(jsonify({"error": "Invalid ID format"}), 400)

    # removing Active from data, cause we have sepparate functions for it
    if 'active' in data:
        active = data.pop('active')
    
    # check if we have atleast one var for update
    if not data:
        return make_response(jsonify({"error": "No data provided for update"}), 400)
    
    try:
        updated_user = User().update(user_id, data)
        if updated_user is None:
            return make_response(jsonify({"error": "User not found or data not changed"}), 404)
        return jsonify(updated_user), 200
    except Exception as e:
        return make_response(jsonify({"error": str(e)}), 500)


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
        try:  # to check if new alert needs to be silenced
            silence_rules = list(app.db['silence'].find({}))
        except pymongo.errors.PyMongoError as e:
            raise InternalServerError("Failed to retrieve silence rules from MongoDB: %s" % e)

        with alerts_lock:
            new_alerts = []  # list of new alerts
            updated_alerts = []  # list of updated alerts
            update_alerts_query = []  # list to hold MongoDB query to update 'current' collection
            new_history_entries = []  # list of entries to add to 'history' collection
            for a in data['update']:
                if is_resolved(a): continue  # do not process resolved alerts in 'update' section

                if silence_rules:
                    for rule in silence_rules:
                        if regexp_alerts([a], rule):
                            a['silenced'] = True
                            a['comment'] = rule['comment']

                existing_alert = lookup_alert(alerts, a)
                if existing_alert is None:  # new alert
                    new_alerts.append(a)
                    continue  # next 'a' from data['update]', please

                existing_alert = existing_alert.copy()  # we will update global list later

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
                if a is None: continue  # we don't have this alert in the global list, skip
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
def on_connect(user, data=None):
    global alerts
    with alerts_lock:
        emit('init', parse_json(alerts))
