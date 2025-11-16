from flask import Blueprint, request, jsonify
from models.db import db
from models.category import Category

admin_categories = Blueprint("admin_categories", __name__)

# CREATE CATEGORY
@admin_categories.post("/add")
def add_category():
    data = request.json
    name = data.get("name")
    restaurant_id = data.get("restaurant_id")

    category = Category(name=name, restaurant_id=restaurant_id)
    db.session.add(category)
    db.session.commit()

    return jsonify({"message": "Category added", "category": category.to_dict()})

# GET CATEGORIES BY RESTAURANT
@admin_categories.get("/allcategories/<restaurant_id>")
def get_categories(restaurant_id):
    categories = Category.query.filter_by(restaurant_id=restaurant_id).all()
    return jsonify([c.to_dict() for c in categories])

#UPDATE CATEGORY
@admin_categories.patch("/update/<category_id>")
def update_category(category_id):
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid or missing JSON body"}), 400

    category = Category.query.get_or_404(category_id)

    # Update only the fields provided
    if "name" in data:
        category.name = data["name"]

    db.session.commit()

    return jsonify({
        "message": "Category updated",
        "category": category.to_dict()
    }), 200


# DELETE CATEGORY
@admin_categories.delete("/delete/<category_id>")
def delete_category(category_id):
    category = Category.query.get_or_404(category_id)
    db.session.delete(category)
    db.session.commit()

    return jsonify({"message": "Category deleted"})