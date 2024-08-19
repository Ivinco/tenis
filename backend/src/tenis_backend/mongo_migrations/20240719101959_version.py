from mongo_migrate.base_migrate import BaseMigration


class Migration(BaseMigration):
    def upgrade(self):
        pass
        
    def downgrade(self):
        pass
        
    def comment(self):
        return 'INIT_CLEAN_DB'
    