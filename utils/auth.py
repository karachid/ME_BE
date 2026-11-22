from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import current_app, g, jsonify, request

from models.db import db
from models.owner import Owner

TOKEN_LIFETIME = timedelta(days=7)


def create_token(owner):
    payload = {
        "sub": str(owner.id),
        "exp": datetime.now(timezone.utc) + TOKEN_LIFETIME,
    }
    return jwt.encode(payload, current_app.config["SECRET_KEY"], algorithm="HS256")


def require_owner(view):
    """Protect a route: needs 'Authorization: Bearer <token>'. Sets g.owner."""

    @wraps(view)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return jsonify({"error": "Authentication required"}), 401
        try:
            payload = jwt.decode(
                header[7:], current_app.config["SECRET_KEY"], algorithms=["HS256"]
            )
            owner = db.session.get(Owner, int(payload["sub"]))
        except (jwt.InvalidTokenError, KeyError, ValueError):
            return jsonify({"error": "Invalid or expired token"}), 401
        if owner is None:
            return jsonify({"error": "Invalid or expired token"}), 401
        g.owner = owner
        return view(*args, **kwargs)

    return wrapper
