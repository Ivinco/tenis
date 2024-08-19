# migration_manager.py
import os
import re
import json
import sys
from datetime import datetime
from mongo_migrate.migration_manager import MigrationManager
from mongo_migrate.migration_cli import Config
from pymongo import MongoClient
from pymongo.errors import CollectionInvalid

def run_migrations():
    config_path = os.path.join(os.path.dirname(__file__), 'static', 'mongo_config.json')

    with open(config_path, 'r') as config_file:
        config_data = json.load(config_file)

    config_params = config_data['mongo_migrate']
    CODE_VERSION = config_params.get('CODE_VERSION')
    DEBUG = config_params.get('DEBUG_MODE', False)
    MONGO_HOST = config_params.get('MONGO_HOST')
    MONGO_PORT = config_params.get('MONGO_PORT')
    DATABASE = config_params.get('DATABASE')
    MIGRATIONS_PATH = os.path.join(os.path.dirname(__file__), config_params.get('MIGRATIONS_PATH'))
    #MIGRATIONS_PATH = config_params.get('MIGRATIONS_PATH')

    if not CODE_VERSION:
        print("Error: CODE_VERSION is not specified in config.json")
        sys.exit(1)

    if not MIGRATIONS_PATH:
        print("Error: MIGRATIONS_PATH is not specified in config.json")
        sys.exit(1)

    config = Config(
        host=MONGO_HOST,
        port=MONGO_PORT,
        database=DATABASE
    )

    manager = MigrationManager(config, MIGRATIONS_PATH)

    def debug_log(message):
        if DEBUG:
            print(message)

    def get_migration_timestamps(migrations_path):
        debug_log(f"Executing get_migration_timestamps with migrations_path={migrations_path}")
        migration_files = filter(lambda x: re.match(r'\d+_.+\.py', x), os.listdir(migrations_path))
        migration_files = sorted(migration_files)
        timestamps = [manager.timestamp_from_filename(mf) for mf in migration_files]
        debug_log(f"Migration timestamps: {timestamps}")
        return timestamps

    def migration_exists(target_migration, migration_timestamps):
        return target_migration in migration_timestamps

    def upgrade_to_migration(target_migration):
        debug_log(f"Executing upgrade_to_migration with target_migration={target_migration}")
        migration_timestamps = get_migration_timestamps(MIGRATIONS_PATH)
        if not migration_exists(target_migration, migration_timestamps):
            print(f"Error: Migration {target_migration} does not exist.")
            sys.exit(1)
        manager.migrate('upgrade', target_migration)

    def downgrade_to_migration(target_migration):
        debug_log(f"Executing downgrade_to_migration with target_migration={target_migration}")
        migration_timestamps = get_migration_timestamps(MIGRATIONS_PATH)
        if not migration_exists(target_migration, migration_timestamps):
            print(f"Error: Migration {target_migration} does not exist.")
            sys.exit(1)
        current_db_version = db.migration_history.find_one(sort=[('migration_datetime', -1)])['migration_datetime']
        debug_log(f"Current DB version: {current_db_version}")
        if target_migration < current_db_version and target_migration < CODE_VERSION:
            debug_log(f"Downgrade not allowed: target migration {target_migration} is older than the current code version {CODE_VERSION}.")
        else:
            manager.migrate('downgrade', target_migration)

    def perform_migration():
        debug_log("Executing perform_migration")
        migration_timestamps = get_migration_timestamps(MIGRATIONS_PATH)

        if not migration_timestamps:
            print("No migrations found in the migrations directory.")
            return False

        last_migration_timestamp = migration_timestamps[-1]
        debug_log(f"Last migration timestamp: {last_migration_timestamp}")

        try:
            migration_performed = False
            if 'migration_history' in db.list_collection_names():
                debug_log("Migration history collection found.")
                migration_history = list(db.migration_history.find().sort([('migration_datetime', -1)]))
                debug_log(f"Migration history: {migration_history}")

                if migration_history:
                    last_db_migration = migration_history[0]['migration_datetime']
                    debug_log(f"Last DB migration: {last_db_migration}")

                    if last_db_migration == CODE_VERSION:
                        print("MongoDB scheme is up-to-date.")
                    elif last_db_migration < CODE_VERSION:
                        debug_log(f"Upgrading to the latest MongoDB migration: {CODE_VERSION}")
                        upgrade_to_migration(CODE_VERSION)
                        migration_performed = True
                    elif last_db_migration > CODE_VERSION:
                        debug_log(f"Downgrading to the target MongoDB migration: {CODE_VERSION}")

                        if not migration_exists(CODE_VERSION, migration_timestamps):
                            print(f"Error: Migration {CODE_VERSION} does not exist.")
                            return False

                        migrations_to_downgrade = sorted(set(m['migration_datetime'] for m in migration_history if m['migration_datetime'] > CODE_VERSION), reverse=True)
                        debug_log(f"Migrations to downgrade: {migrations_to_downgrade}")

                        for migration in migrations_to_downgrade:
                            debug_log(f"Performing downgrade for migration: {migration}")
                            manager.migrate('downgrade', migration)
                            debug_log(f"Downgraded migration: {migration}")
                            migration_performed = True

                        debug_log(f"Deleting migrations from history with datetime > {CODE_VERSION}")
                        db.migration_history.delete_many({'migration_datetime': {'$gt': CODE_VERSION}})
                        
                        existing_entry = db.migration_history.find_one({'migration_datetime': CODE_VERSION})
                        if existing_entry:
                            debug_log(f"Updating existing migration history entry for {CODE_VERSION}")
                            db.migration_history.update_one(
                                {'_id': existing_entry['_id']},
                                {'$set': {'created_on': datetime.utcnow()}}
                            )
                        else:
                            debug_log(f"Inserting new migration history entry for {CODE_VERSION}")
                            db.migration_history.insert_one({
                                'migration_datetime': CODE_VERSION,
                                'created_on': datetime.utcnow()
                            })
                else:
                    print(f"No migrations found in migration_history. Upgrading MongoDB to the latest migration: {CODE_VERSION}")
                    upgrade_to_migration(CODE_VERSION)
                    migration_performed = True
            else:
                print(f"No migration_history collection found. Upgrading MongoDB to the latest migration: {CODE_VERSION}")
                upgrade_to_migration(CODE_VERSION)
                migration_performed = True

            return migration_performed
        except CollectionInvalid as e:
            print(f"Error accessing migration_history collection: {e}")
            return False
        except Exception as e:
            print(f"An error occurred: {e}")
            return False

    debug_log(f"Connecting to MongoDB at mongodb://{config.host}:{config.port}, database={config.database}")
    client = MongoClient(f'mongodb://{config.host}:{config.port}')
    db = client[config.database]

    perform_migration()
