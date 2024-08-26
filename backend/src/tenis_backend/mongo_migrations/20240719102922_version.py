from mongo_migrate.base_migrate import BaseMigration


class Migration(BaseMigration):
    def upgrade(self):
        # Create 'current' collection if it doesn't exist
        if 'current' not in self.db.list_collection_names():
            self.db.create_collection('current')
            self.db.current.create_index(
                [('project', 1), ('host', 1), ('alertName', 1)], unique=True)

        # Create 'history' collection if it doesn't exist
        if 'history' not in self.db.list_collection_names():
            self.db.create_collection('history')
            self.db.history.create_index(
                [('project', 1), ('host', 1), ('alertName', 1), ('logged', 1)])

        # Create 'users' collection if it doesn't exist
        if 'users' not in self.db.list_collection_names():
            self.db.create_collection('users')
            self.db.users.create_index([("_id", 1)], name="_id_") 

        # Create 'silence' collection if it doesn't exist
        if 'silence' not in self.db.list_collection_names():
            self.db.create_collection('silence')
            self.db.silence.create_index([("_id", 1)], name="_id_") 
        pass
        
    def downgrade(self):
        self.db.drop_collection('current')
        self.db.drop_collection('history')
        self.db.drop_collection('users')
        self.db.drop_collection('silence')
        pass
        
    def comment(self):
        return 'Installing required collections and indexes'
    