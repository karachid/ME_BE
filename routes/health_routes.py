from flask import Blueprint, jsonify

health_routes = Blueprint("health_routes", __name__)


@health_routes.get("/")
def health_check():
    return jsonify({"status": "ok", "service": "MenuXpert API"})
