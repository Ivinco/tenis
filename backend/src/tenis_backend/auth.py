from functools import wraps
import jwt
import uuid
from datetime import datetime, timezone
from flask import request, abort
from flask import current_app
from flask_socketio import disconnect
from werkzeug.exceptions import NotAcceptable, Forbidden, Unauthorized, BadRequest, InternalServerError
from .user import User


def create_token(user_id, secret, token_type, expires):
    """ Create token with given content, type, expiration timestamp """
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


def decode_token(token, secret_key, token_type = "access"):
    """ Decode token, raise exception from werkzeug.exceptions if something is wrong """
    try:
        if not token:
            raise Forbidden("No token provided")
        # jwt.decode also takes care of token expiration
        decoded_token = jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])
        current_user = User().get_by_id(decoded_token["sub"])
        if "type" not in decoded_token:
            decoded_token["type"] = "access"
        if decoded_token["type"] != token_type:
            raise NotAcceptable("Invalid token type")
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
    return current_user


def token_required(refresh: bool = False): 
    """
    Decorator for flask routes: if a flask route sub is decorated with @token_required(),
    the route is protected.

    Note that refresh=True also changes @token_required behavior: it looks for refresh token
    in cookie called 'refresh_token', not in Authorization header
    """

    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            token = None
            token_type = None
            if refresh:
                # get token from cookies
                token_type = "refresh"
                token = request.cookies.get("refresh_token")
            else:
                # get token from headers
                token_type = "access"
                if "Authorization" in request.headers:
                    token = request.headers["Authorization"].split()[1]

            current_user = decode_token(token, current_app.config["SECRET_KEY"], token_type)
            return fn(current_user, *args, **kwargs)
        return decorator
    return wrapper


def token_required_ws(fn):
    """ Websocket version of token_required """
    @wraps(fn)
    def decorator(*args, **kwargs):
        token = None
        current_user = None
        if "Authorization" in request.headers:
            token = request.headers["Authorization"].split()[1]
        try:
            current_user = decode_token(token, current_app.config["SECRET_KEY"])
        except Exception:
            # On any auth error we disconnect
            disconnect()
        return fn(current_user, *args, **kwargs)
    return decorator
