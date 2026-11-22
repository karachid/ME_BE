import time
from collections import defaultdict, deque

from flask import Blueprint, g, jsonify, request

from models.db import db
from models.owner import Owner
from utils.auth import create_token, require_owner

auth_routes = Blueprint("auth_routes", __name__)

# Basic brute-force protection: max 10 failed logins per IP per 5 minutes.
# In-memory, per process: good enough for a single small deployment.
_WINDOW_SECONDS = 300
_MAX_FAILURES = 10
_failures = defaultdict(deque)


def _too_many_failures(ip):
    now = time.time()
    attempts = _failures[ip]
    while attempts and now - attempts[0] > _WINDOW_SECONDS:
        attempts.popleft()
    return len(attempts) >= _MAX_FAILURES


@auth_routes.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    ip = request.remote_addr

    if _too_many_failures(ip):
        return jsonify({"error": "Too many attempts, try again in a few minutes"}), 429

    owner = Owner.query.filter_by(email=email).first()
    if owner is None or not owner.check_password(password):
        _failures[ip].append(time.time())
        return jsonify({"error": "Invalid email or password"}), 401

    return jsonify({"token": create_token(owner), "owner": owner.to_dict()})


@auth_routes.get("/me")
@require_owner
def me():
    return jsonify({"owner": g.owner.to_dict()})


@auth_routes.post("/change-password")
@require_owner
def change_password():
    data = request.get_json(silent=True) or {}
    current = str(data.get("current_password", ""))
    new = str(data.get("new_password", ""))

    if not g.owner.check_password(current):
        return jsonify({"error": "Current password is incorrect"}), 400
    if len(new) < 8:
        return jsonify({"error": "New password must be at least 8 characters"}), 400
    if new == current:
        return jsonify({"error": "New password must be different"}), 400

    g.owner.set_password(new)
    db.session.commit()
    return jsonify({"message": "Password changed"})
