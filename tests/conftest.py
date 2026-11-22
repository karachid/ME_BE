import os
import sys

# Must be set before `app` is imported (it builds a module-level app).
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["SECRET_KEY"] = "test-secret"
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest  # noqa: E402

from app import create_app  # noqa: E402
from utils import view_buffer  # noqa: E402
from models import Category, Item, Owner, Restaurant, Subcategory  # noqa: E402
from models.db import db  # noqa: E402


def _make_restaurant(name, email):
    resto = Restaurant(name=name)
    db.session.add(resto)
    db.session.flush()
    cat = Category(name="Boissons", restaurant_id=resto.id)
    db.session.add(cat)
    db.session.flush()
    sub = Subcategory(name="Cafés", category_id=cat.id)
    db.session.add(sub)
    db.session.flush()
    item = Item(name="Espresso", price=20, subcategory_id=sub.id)
    db.session.add(item)
    owner = Owner(email=email, restaurant_id=resto.id)
    owner.set_password("password123")
    db.session.add(owner)
    db.session.commit()
    return {"restaurant": resto.id, "sub": sub.id, "item": item.id}


@pytest.fixture()
def app():
    view_buffer.reset()
    app = create_app({"VIEW_FLUSH_SECONDS": 0})  # 0 = write visits immediately
    with app.app_context():
        db.drop_all()
        db.create_all()
        app.ids = {
            "a": _make_restaurant("Resto A", "a@test.ma"),
            "b": _make_restaurant("Resto B", "b@test.ma"),
        }
        yield app
        db.session.remove()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def auth(client):
    """Headers for owner A."""
    res = client.post(
        "/auth/login", json={"email": "a@test.ma", "password": "password123"}
    )
    return {"Authorization": f"Bearer {res.get_json()['token']}"}
