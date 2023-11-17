from functools import wraps
import jwt
import uuid
from datetime import datetime, timezone
from flask import request, abort
from flask import current_app
from werkzeug.exceptions import NotAcceptable, Forbidden, Unauthorized, BadRequest, InternalServerError
from .user import User

def create_token(user_id, secret, token_type, expires):
    now = datetime.now(timezone.utc)
    token_data = {
        "iat": now, # Issued at
        "jti": str(uuid.uuid4()), # JSON Token ID
        "type": token_type, # 'refresh' or 'access'
        "exp": expires,
        "sub": user_id # token subject
    }
    return jwt.encode(
        token_data,
        secret,
        algorithm="HS256"
    )

def token_required(refresh: bool = False): 
    """
    Note that refresh=True also changes @token_required behavior: it looks for refresh token
    in cookie called 'refresh_token', not in Authorization header
    """

    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            token = None
            if refresh:
                # get token from cookies
                token = request.cookies.get("refresh_token")
            else:
                # get tokent from headers
                if "Authorization" in request.headers:
                    token = request.headers["Authorization"].split()[1]

            if not token:
                raise Forbidden("No token provided")

            try:
                # jwt.decode also takes care of token expiration
                decoded_token = jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])
                current_user = User().get_by_id(decoded_token["sub"])
                if "type" not in decoded_token:
                    decoded_token["type"] = "access"
                if not refresh and decoded_token["type"] == "refresh":
                    raise NotAcceptable("Cannot use refresh token as auth token")
                elif refresh and decoded_token["type"] != "refresh":
                    raise NotAcceptable("Cannot use auth token as refresh token")
                if current_user is None:
                    raise BadRequest("Broken token")
                if not current_user["active"]:
                    raise Unauthorized("User is disabled")
            except jwt.ExpiredSignatureError:
                raise Unauthorized("Token expired")
            except jwt.InvalidTokenError:
                raise BadRequest("Invalid token")
            except Exception as e:
                raise InternalServerError(str(e))
            return fn(current_user, *args, **kwargs)
        return decorator
    return wrapper
