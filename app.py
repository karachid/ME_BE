from flask import Flask
from flask_cors import CORS
from models.db import db
from routes.menu_routes import menu_routes
from routes.item_routes import item_routes
from routes.health_routes import health_routes
from models import Restaurant, Category, Subcategory, Item
import config

def create_app():
    app = Flask(__name__)
    CORS(app)

    app.config["SQLALCHEMY_DATABASE_URI"] = config.DB_URL
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)

    app.register_blueprint(health_routes, url_prefix="/")
    app.register_blueprint(menu_routes, url_prefix="/api")
    app.register_blueprint(item_routes, url_prefix="/api")

    return app

app = create_app()

if __name__ == "__main__":
    with app.app_context():
        db.create_all()  # auto create tables for test mode
    app.run(host="0.0.0.0", port=5000, debug=True)

