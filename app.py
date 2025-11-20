from flask import Flask
from flask_cors import CORS
from models.db import db
from routes.menu_routes import menu_routes
from routes.item_routes import item_routes
from routes.health_routes import health_routes
from routes.filldb_routes import filldb_routes
from routes.admin_items import admin_items
from routes.admin_categories import admin_categories
from models import Restaurant, Category, Subcategory, Item
from utils.logger import setup_logger
import config


def create_app():
    logger = setup_logger()
    app = Flask(__name__)
    logger.info("MenuXpert backend starting ...")

    CORS(app)

    app.config["SQLALCHEMY_DATABASE_URI"] = config.DB_URL
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)

    app.register_blueprint(health_routes, url_prefix="/")
    app.register_blueprint(filldb_routes, url_prefix="/db")
    app.register_blueprint(menu_routes, url_prefix="/api")
    app.register_blueprint(item_routes, url_prefix="/api")
    app.register_blueprint(admin_items, url_prefix="/admin/items")
    app.register_blueprint(admin_categories, url_prefix="/admin/categories")

    return app

app = create_app()

if __name__ == "__main__":
    with app.app_context():
        db.create_all()  # auto create tables for test mode
    app.run(host="0.0.0.0", port=5000, debug=True)

