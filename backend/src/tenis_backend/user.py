import bson
from bson import ObjectId
from flask import current_app
from werkzeug.security import generate_password_hash, check_password_hash


class User:
    """User Model, stolen from https://www.loginradius.com/blog/engineering/guest-post/securing-flask-api-with-jwt/ - beer to Babatunde Koiki"""
    def __init__(self):
        self.db = current_app.db
        return

    def create(self, name="", email="", password="", avatar="", grouping=False, timezone="Browser", projects="All", phone="", is_admin=True):
        """Create a new user"""
        user = self.get_by_email(email)
        if user:
            return
        new_user = self.db.users.insert_one(
            {
                "name": name,
                "email": email,
                "password": self.encrypt_password(password),
                "avatar": avatar,
                "grouping": grouping,
                "timezone": timezone,
                "projects": projects,
                "phone": phone,
                "is_admin": is_admin,
                "active": True
            }
        )
        return self.get_by_id(new_user.inserted_id)

    def get_all(self):
        """Get all users"""
        users = self.db.users.find()
        return [{**user, "_id": str(user["_id"])} for user in users]

    def get_by_id(self, user_id):
        """Get a user by id"""
        user = self.db.users.find_one({"_id": bson.ObjectId(user_id), "active": True})
        if not user:
            return
        user["_id"] = str(user["_id"])
        user.pop("password")
        return user

    def get_by_email(self, email):
        """Get a user by email"""
        user = self.db.users.find_one({"email": email})
        if not user:
            return
        user["_id"] = str(user["_id"])
        return user

    def update(self, user_id, update_data):
        """Update user data based on the provided fields"""
        
        result = self.db.users.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": update_data
            }
        )
        
        if result.modified_count == 0:
            return False 
        
        return self.get_by_id(user_id)

    def delete(self, user_id):
        """Delete a user"""
        result = self.db.users.delete_one({"_id": ObjectId(user_id)})
        user = self.get_by_id(user_id)
        if result.deleted_count > 0:
            return True
        else:
            return False

    def disable_account(self, user_id):
        """Disable a user account"""
        result = self.db.users.update_one(
            {"_id": bson.ObjectId(user_id)},
            {
                "$set": {"active": False}
            }
        )
        user = self.get_by_id(user_id)
        if result.modified_count > 0:
            return True
        else:
            return False

    def enable_account(self, user_id):
        """Disable a user account"""
        result = self.db.users.update_one(
            {"_id": bson.ObjectId(user_id)},
            {
                "$set": {"active": True}
            }
        )
        user = self.get_by_id(user_id)
        if result.modified_count > 0:
            return True
        else:
            return False

    def encrypt_password(self, password):
        """Encrypt password"""
        return generate_password_hash(password)

    def login(self, email, password):
        """Login a user"""
        user = self.get_by_email(email)
        if not user or not check_password_hash(user["password"], password):
            return
        user.pop("password")
        return user
