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
from .json_validation import schema, silence_schema, user_schema, user_add_schema, user_update_schema, \
    history_request_schema
from flask_swagger_ui import get_swaggerui_blueprint

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

# This can be useful for testing
#app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(minutes=1)
#app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(minutes=5)
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)

# Load alerts from the DB
alerts_lock = threading.Lock()
with alerts_lock:
    alerts = load_alerts(app.db['current'])


def check_silence(list_of_alerts, list_of_rules):
    """
    Check/set 'silenced' and 'comment' in provided list of alerts according to provided list of rules

    :param list_of_alerts: List of alerts to check
    :param list_of_rules: List of rules to use
    :return: Nothing
    """
    for rule in list_of_rules:
        matched_alerts = regexp_alerts(list_of_alerts, rule)
        if matched_alerts:
            for alert in matched_alerts:
                alert["silenced"] = True
                alert["comment"] = rule["comment"]


# Load silence rules from the DB
with alerts_lock:
    silence_rules = load_alerts(app.db['silence'])
    # check if alerts needs to be silenced
    check_silence(alerts, silence_rules)


# Internal periodic tasks via BackgroundScheduler
def silence_scheduler():
    """
    Check if silence period is over
    """
    unsilence_list = []
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


from datetime import datetime

def get_history_alerts(start_datetime, end_datetime):
    start_timestamp = datetime.utcfromtimestamp(start_datetime)
    end_timestamp = datetime.utcfromtimestamp(end_datetime)
    query = {'logged': {'$gt': start_timestamp, '$lte': end_timestamp}}
    cursor = app.db['history'].find(query)

    alerts_by_id = {}
    for record in cursor:
        alert_id = record['alert_id']
        record['logged'] = record['logged'].timestamp()
        if alert_id not in alerts_by_id or record['logged'] > alerts_by_id[alert_id]['logged']:
            filtered_record = {key: value for key, value in record.items() if key not in ['_id']}
            filtered_record['logged'] = int(record['logged'])
            filtered_record['alert_id'] = str(record['alert_id'])
            alerts_by_id[alert_id] = filtered_record

    result = list(alerts_by_id.values())
    return result



# swagger specific
SWAGGER_URL = '/swagger'
API_URL = '/static/swagger.json'
SWAGGERUI_BLUEPRINT = get_swaggerui_blueprint(
    SWAGGER_URL,
    API_URL,
    config={
        'app_name': "Ivinco Tenis API"
    }
)
app.register_blueprint(SWAGGERUI_BLUEPRINT, url_prefix=SWAGGER_URL)



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
        silence_rule = request.json
        jsonschema.validate(instance=silence_rule, schema=silence_schema)
    except jsonschema.exceptions.ValidationError as e:
        raise BadRequest(e.message)

    if not silence_rule['project'] and not silence_rule['alertName'] and not silence_rule['host']:
        raise InternalServerError("Too broad regex pattern")

    # check if we already have similar rule
    for rule in silence_rules:
        test = {
            '_id': rule['_id'],
            'author': rule['author'],
            'project': silence_rule['project'],
            'host': silence_rule['host'],
            'alertName': silence_rule['alertName'],
            'startSilence': silence_rule['startSilence'],
            'endSilence': silence_rule['endSilence'],
            'comment': silence_rule['comment'],
        }

        if rule == test:
            return "We already have similar rule", 200

    ts = datetime.now().timestamp()
    silence_rule["author"] = user['email']

    if silence_rule['endSilence'] and silence_rule['endSilence'] <= ts:
        return "Too late :) endSilence time has passed already", 200

    updated_alerts = []  # list of updated alerts
    with alerts_lock:
        matched_alerts = regexp_alerts(alerts, silence_rule)

    if matched_alerts:
        for alert in matched_alerts:
            alert["silenced"] = True
            alert["comment"] = silence_rule["comment"]
            updated_alerts.append(alert)

    try:
        res = app.db['silence'].insert_one(silence_rule)
        silence_rule['_id'] = res.inserted_id
        silence_rules.append(silence_rule)
    except pymongo.errors.PyMongoError as e:
        raise InternalServerError("Failed to save silencer in MongoDB: %s" % e)

    if updated_alerts:
        send_alerts(updated_alerts, [])

    return "OK", 200


def unsilence_matched_alerts(list_of_rules):
    """
    Function is used in /unsilence POST method and in background silence_scheduler

    :param list_of_rules: List of silence rules to check
    :return: Nothing
    """
    updated_alerts = []  # list of updated alerts
    delete_rule_query = []  # list to hold MongoDB query to delete from 'silence' collection
    with alerts_lock:
        for rule in list_of_rules:
            delete_rule_query.append(pymongo.DeleteOne({'_id': rule['_id']}))
            matched_alerts = regexp_alerts(alerts, rule)
            silence_rules.remove(rule)  # remove from in-memory list
            if matched_alerts:
                for alert in matched_alerts:
                    alert["silenced"] = False
                    alert["comment"] = ""

                    # check if alert affected by other silence rule(s)
                    for other_rule in silence_rules:
                        if regexp_alerts([alert], other_rule):
                            alert["silenced"] = True
                            alert["comment"] = other_rule["comment"]
                            break
                    updated_alerts.append(alert)

    if delete_rule_query:
        try:
            app.db['silence'].bulk_write(delete_rule_query)
        except pymongo.errors.PyMongoError as e:
            raise InternalServerError("Failed to delete silence rules from MongoDB: %s" % e)

    if updated_alerts:
        send_alerts(updated_alerts, [])


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

    # transform list of IDs into list of ObjectIDs
    obj_id_list = [ObjectId(item['silenceId']) for item in data['unsilence']]
    # select rules that match by ObjectIDs
    list_of_rules = [rule for rule in silence_rules if rule['_id'] in obj_id_list]

    if list_of_rules:
        unsilence_matched_alerts(list_of_rules)
    return "OK", 200


@app.route('/silenced', methods=['GET'])
@token_required()  # note () are required!
def silenced(user):
    """
    Method to return a json list of 'silence' rules
    """
    return json.dumps(silence_rules, default=str), 200




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

    if not user['active']:
        raise Unauthorized("User not active")

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


@app.route('/history')
@token_required()
def send_history_alerts(user):
    """
    Method to get all active alerts on requested timestamp
    """
    history_period = app.config['HISTORY_PERIOD_MINUTES']
    try:
        data = int(request.args.get("datetime"))
        jsonschema.validate(instance=data, schema=history_request_schema)
    except jsonschema.exceptions.ValidationError as e:
        raise BadRequest(e.message)
    start_datetime = data - history_period * 60
    history_alerts = get_history_alerts(start_datetime, data)
    resp = {'history': history_alerts}
    return jsonify(resp), 200


@app.route('/users')
@token_required()
def get_users(current_user):
    """Return list of all users"""
    try:
        users = User().get_all()
        for user in users:
            user.pop("password")
        return jsonify(users), 200
    except Exception as e:
        raise InternalServerError(f"Failed to retrieve users: {str(e)}")


@app.route('/user', methods=['POST'])
@token_required()
def get_user_by_id(current_user):
    """Return user by id"""
    try:
        data = request.json
        jsonschema.validate(instance=data, schema=user_schema)
    except jsonschema.exceptions.ValidationError as e:
        raise BadRequest(e.message)

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
    try:
        data = request.json
        jsonschema.validate(instance=data, schema=user_schema)
    except jsonschema.exceptions.ValidationError as e:
        raise BadRequest(e.message)

    if not data or 'email' not in data:
        return make_response(jsonify({"error": "Please provide email in JSON format"}), 400)
    try:
        email = data['email']
        user = User().get_by_email(email)
        user.pop("password")
        if not user:
            return make_response(jsonify({"error": "User not found"}), 404)
        return jsonify(user), 200
    except Exception as e:
        raise InternalServerError(f"Failed to retrieve user: {str(e)}")


@app.route('/user/add', methods=['POST'])
@token_required()  # note () are required!
def add_user(current_user):
    """Create new User"""
    try:
        data = request.json
        jsonschema.validate(instance=data, schema=user_add_schema)
    except jsonschema.exceptions.ValidationError as e:
        raise BadRequest(e.message)

    try:
        # email validation
        valid_email = validate_email(data['email']).email
    except EmailNotValidError as e:
        return make_response(jsonify({"error": "Invalid email"}), 400)

    email = valid_email  # required
    name = data.get('name', "")  # optional
    password = data.get('password')  # required
    avatar = data.get('avatar', "")

    # Is it should be in mongo ? 
    grouping = data.get('grouping', False)  # optional
    timezone = data.get('timezone', "Browser")  # optional
    projects = data.get('projects', "All")  # optional

    phone = data.get('phone', "")  # optional
    active = data.get('active', True)  # optional
    is_admin = data.get('is_admin', True)  # optional

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
    try:
        data = request.json
        jsonschema.validate(instance=data, schema=user_schema)
    except jsonschema.exceptions.ValidationError as e:
        raise BadRequest(e.message)

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
    try:
        data = request.json
        jsonschema.validate(instance=data, schema=user_schema)
    except jsonschema.exceptions.ValidationError as e:
        raise BadRequest(e.message)
    
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
    try:
        data = request.json
        jsonschema.validate(instance=data, schema=user_schema)
    except jsonschema.exceptions.ValidationError as e:
        raise BadRequest(e.message)
    
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
        return jsonify({"message": "User enabled successfully"}), 200
    except Exception as e:
        return make_response(jsonify({"error": str(e)}), 500)


@app.route('/user/update', methods=['POST'])
@token_required() 
def update_user(current_user):
    """Update user data"""
    try:
        data = request.json
        jsonschema.validate(instance=data, schema=user_update_schema)
    except jsonschema.exceptions.ValidationError as e:
        raise BadRequest(e.message)

    if not data or 'id' not in data:
        user_id = current_user['_id']
    else:
        user_id = data['id']
        data.pop('id')  # removing ID from data

    try:
        valid_id = ObjectId(user_id)
    except:
        return make_response(jsonify({"error": "Invalid ID format"}), 400)

    # removing Active from data, cause we have separate functions for it
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
        with alerts_lock:
            new_alerts = []  # list of new alerts
            updated_alerts = []  # list of updated alerts
            update_alerts_query = []  # list to hold MongoDB query to update 'current' collection
            new_history_entries = []  # list of entries to add to 'history' collection
            for a in data['update']:
                if is_resolved(a): continue  # do not process resolved alerts in 'update' section

                if silence_rules:
                    check_silence([a], silence_rules)

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
    user = User().get_by_id(user["_id"])
    if not user:
        raise Unauthorized("User doesn't exist")
    if not user['active']:
        raise Unauthorized("User not active")

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
