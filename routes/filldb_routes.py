from flask import Blueprint, jsonify
from models.db import db
from models.restaurant import Restaurant
from models.category import Category
from models.subcategory import Subcategory
from models.item import Item

filldb_routes = Blueprint("filldb_routes", __name__)

@filldb_routes.route("/filldb", methods=["POST"])
def fill_db():
    # Drop tables and recreate (for testing)
    db.drop_all()
    db.create_all()

    # Create restaurant
    rest = Restaurant(name="Pasta Palace")
    db.session.add(rest)

    # Create categories
    cat1 = Category(name="Starters", restaurant=rest)
    cat2 = Category(name="Main Courses", restaurant=rest)

    # Add categories explicitly
    db.session.add_all([cat1, cat2])

    # Create subcategories
    sc1 = Subcategory(name="Soups", category=cat1)
    sc2 = Subcategory(name="Salads", category=cat1)
    sc3 = Subcategory(name="Pasta", category=cat2)

    # Add subcategories explicitly
    db.session.add_all([sc1, sc2, sc3])

    # Create items
    item1 = Item(name="Tomato Soup", description="Fresh tomatoes", price=4.5, subcategory=sc1, is_available=True)
    item2 = Item(name="Chicken Soup", description="Slow cooked", price=5.0, subcategory=sc1, is_available=False)  # sold out
    item3 = Item(name="Caesar Salad", description="Crispy & fresh", price=6.0, subcategory=sc2, is_available=True)

    # Add items explicitly
    db.session.add_all([item1, item2, item3])

    db.session.commit()
    
    return jsonify({"message": "Database filled!"})