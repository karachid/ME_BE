from flask import Flask, request
import time
from flask_cors import CORS
from models.db import db
from routes.auth_routes import auth_routes
from routes.menu_routes import menu_routes
from routes.item_routes import item_routes
from routes.health_routes import health_routes
from routes.filldb_routes import filldb_routes
from routes.admin_items import admin_items
from routes.admin_categories import admin_categories
from routes.admin_dashboard import admin_dashboard
from models import Restaurant, Category, Subcategory, Item, Owner
from models.schema import ensure_schema
from utils.cli import create_owner
from utils.logger import setup_logger
import config


def create_app(overrides=None):
    logger = setup_logger()
    app = Flask(__name__)
    logger.info("MenuXpert backend starting ...")

    @app.before_request
    def log_request_start():
        request.start_time = time.time()
        logger.info(f"➡️ {request.method} {request.path} from {request.remote_addr}")

    @app.after_request
    def log_request_end(response):
        duration = time.time() - request.start_time
        logger.info(
            f"⬅️ {request.method} {request.path} → {response.status_code} ({duration:.2f}s)"
        )
        return response

    CORS(app)

    app.config["SQLALCHEMY_DATABASE_URI"] = config.DB_URL
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["ALLOW_FILLDB"] = config.ALLOW_FILLDB
    app.config["SECRET_KEY"] = config.SECRET_KEY
    app.config["VIEW_FLUSH_SECONDS"] = config.VIEW_FLUSH_SECONDS
    app.config.update(overrides or {})

    if not app.config["SECRET_KEY"]:
        # A guessable key would let anyone forge owner logins, so only allow the
        # development fallback when running against a local SQLite file.
        if app.config["SQLALCHEMY_DATABASE_URI"].startswith("sqlite"):
            logger.warning("SECRET_KEY not set: using an insecure development key")
            app.config["SECRET_KEY"] = config.DEV_SECRET_KEY
        else:
            raise RuntimeError("SECRET_KEY environment variable is required")

    db.init_app(app)
    app.cli.add_command(create_owner)

    app.register_blueprint(health_routes, url_prefix="/")
    app.register_blueprint(filldb_routes, url_prefix="/db")
    app.register_blueprint(auth_routes, url_prefix="/auth")
    app.register_blueprint(menu_routes, url_prefix="/api")
    app.register_blueprint(item_routes, url_prefix="/api")
    app.register_blueprint(admin_items, url_prefix="/admin/items")
    app.register_blueprint(admin_categories, url_prefix="/admin/categories")
    app.register_blueprint(admin_dashboard, url_prefix="/admin")

    with app.app_context():
        db.create_all()  # creates missing tables (e.g. owners)
        ensure_schema()  # adds columns introduced after the DB was created

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
