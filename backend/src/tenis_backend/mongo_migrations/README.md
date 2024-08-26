# MongoDB Migration module
This MongoDB migration module is built on top of the open-source library [mongo-migrate](https://github.com/blitzcode-io/mongo-migrate).
The MongoDB migration module is designed to automate the process of managing changes in the database. 
It allows you to automatically apply and roll back changes in MongoDB, synchronizing the state of the database with the state of the application code.

## Configuration

The configuration of the module is located in the file `static/mongo_config.json` in the working directory. 
This file contains the necessary configuration parameters:

```json
{
    "mongo_migrate": {
        "CODE_VERSION": "20240719102922",
        "DEBUG_MODE": true,
        "MONGO_HOST": "127.0.0.1",
        "MONGO_PORT": 27017,
        "DATABASE": "tenis",
        "MIGRATIONS_PATH": "mongo_migrations"
    }
}
```

* CODE_VERSION: The target migration version that the database should match.
* DEBUG_MODE: Enable detailed logging for debugging.
* MONGO_HOST: The host of the MongoDB server.
* MONGO_PORT: The port of the MongoDB server.
* DATABASE: The name of the database for managing migrations.
* MIGRATIONS_PATH: The path to the directory containing migration files.

## How It Works

1. Loading Configuration: The script loads configuration parameters from the `mongo_config.json` file.
2. Connecting to MongoDB: It establishes a connection to the MongoDB server using the specified host, port, and database name.
3. Checking Migrations: The script checks the current state of the database and compares it with the target version `CODE_VERSION`.
4. Performing Migrations: Depending on the state of the database, the script either applies migrations (upgrade) or rolls them back (downgrade):
    * Upgrade: Applies all migrations up to the specified `CODE_VERSION`.
    * Downgrade: Rolls back migrations to the `CODE_VERSION`.
5. Updating Migration History: The script updates the `migration_history` collection, recording the applied or rolled-back migrations.

## Creating Migrations

Create a new Python file in the directory specified in `MIGRATIONS_PATH`, following the naming format `YYYYMMDDHHMMSS_description.py`.

Example content:

```python
from mongo_migrate.base_migrate import BaseMigration

class Migration(BaseMigration):
    def upgrade(self):
        self.db.create_collection('new_collection')
        self.db.new_collection.create_index([("field", 1)], name="field_index")

    def downgrade(self):
        self.db.drop_collection('new_collection')

    def comment(self):
        return 'Add new_collection with field_index'
```
Alternatively, you can use the CLI interface of the `mongo-migrate` library:
```bash 
mongo-migrate create --host 127.0.0.1 --port 27017 --database tenis --message 'test'
Migration file created: migrations/20240805125017_version.py
```

This command will create the migrations directory if it doesn’t exist and generate a migration template:
```python
from mongo_migrate.base_migrate import BaseMigration

class Migration(BaseMigration):
    def upgrade(self):
        pass

    def downgrade(self):
        pass

    def comment(self):
        return 'test'
```
Once the migration is ready, move it to the directory `backend/src/tenis_backend/mongo_migrations` and update `CODE_VERSION` in `backend/src/tenis_backend/static/mongo_config.json`.

## Applying Migrations

The migration module is executed just before the backend application starts. The module automatically determines the type of migration that needs to be performed based on the `CODE_VERSION` specified in the configuration by comparing the last entry in the `migration_history` collection with the value of `CODE_VERSION`:

    •   If `CODE_VERSION` is newer than the last entry in `migration_history`, an upgrade will be performed.
    •   If `CODE_VERSION` is older than the last entry in `migration_history`, a downgrade will be performed.
    •   If `CODE_VERSION` matches the last entry in `migration_history`, no action will be taken.
    •   If the `migration_history` collection does not exist or is empty, all migrations will be sequentially applied up to the specified `CODE_VERSION`.
    
## Few words about downgrade

If you want to downgrade MongoDB to a specific version, the instructions written in the downgrade function of a migration file will only be executed if the `CODE_VERSION` is lower than the version of the migration file. This ensures that only the changes made by migrations that are newer than the target `CODE_VERSION` are undone.

### For example

List of available migrations:
```bash
20240719101959_version.py 
20240719102040_version.py 
20240719102922_version.py
```
Currently applied migration is `20240719102922`. 
Now, if you want to downgrade MongoDB to version `20240719102040`, you would:
* Set `CODE_VERSION` to `20240719102040`
In this case, the module will not execute the downgrade method in the `20240719102040_version.py` file. Instead, it will only undo the changes made by `20240719102922_version.py`.
* Set `CODE_VERSION` to `20240719101959`
Here, the module will execute the downgrade method in both `20240719102922_version.py` and `20240719102040_version.py`. This will ensure that all changes made by these migrations are undone, reverting the database back to the state defined by `20240719101959`.

The downgrade method in the very first migration (e.g., `20240719101959_version.py`) is never applied because it represents the initial state of the database, which should be maintained.

This logic has been slightly reworked from the default behavior of the `mongo-migrate` library. In the default, if you specify `CODE_VERSION="20240719102040"` or use the command `mongo-migrate downgrade --upto "20240719102040"`, the script would execute the downgrade method in `20240719102040_version.py`.

However, in this reworked logic, the script only performs downgrades for migrations that have been applied after the target `CODE_VERSION`. This approach is better suited for automation, as it prevents unnecessary downgrades and focuses on maintaining consistency with the specified `CODE_VERSION`.