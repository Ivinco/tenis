import os
from flask import Flask
from pymongo import MongoClient
import pymongo
import atexit


# Get environment variables
mongo_host = os.getenv('MONGO_HOST', 'localhost')  # Default to 'localhost' if not set
mongo_dbname = os.getenv('MONGO_DBNAME', 'database')  # Default to 'database' if not set

connection_string = f"mongodb://{mongo_host}/{mongo_dbname}"

app = Flask(__name__)
app.mongodb_client = MongoClient(connection_string)

def cleanup_on_shutdown():
    # Properly close MongoDB connection on shutdown
    app.mongodb_client.close()

atexit.register(cleanup_on_shutdown)

@app.route("/")
def index():
    return "Hello, world!\n", 200

@app.route("/healz")
def healz():
    try:
        app.mongodb_client.admin.command('ping')
    except Exception as e:
        return f"Mongo error: {e!r}\n", 500
    return "penis is up\n", 200
