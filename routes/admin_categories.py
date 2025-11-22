from flask import Blueprint, request, jsonify
from models.db import db
from models.category import Category
from models.subcategory import Subcategory
from utils.admin_logger import log_admin_action

admin_categories = Blueprint("admin_categories", __name__)


# CREATE CATEGORY
@admin_categories.post("/add")
def add_category():
    data = request.json
    name = data.get("name")
    restaurant_id = data.get("restaurant_id")
    subcategories_list = data.get("subcategories", [])

    if not name or not restaurant_id:
        return {"error": "Name and restaurant_id are required"}, 400

    # Create the category
    category = Category(name=name, restaurant_id=restaurant_id)
    db.session.add(category)
    db.session.flush()  # Get category.id before commit

    # Create each subcategory
    created_subcats = []
    for subcat_name in subcategories_list:
        if not isinstance(subcat_name, str) or not subcat_name.strip():
            continue  # skip invalid entries

        subcat = Subcategory(name=subcat_name.strip(), category_id=category.id)
        db.session.add(subcat)
        created_subcats.append(subcat_name.strip())

    db.session.commit()

    log_admin_action(
        action_type="create",
        object_type="category",
        object_id=category.id,
        details=f"Created category '{name}' with subcategories: {created_subcats}",
    )

    return {
        "message": "Category created successfully",
        "category": {
            "id": category.id,
            "name": category.name,
            "restaurant_id": category.restaurant_id,
            "subcategories": [
                {"id": sc.id, "name": sc.name} for sc in category.subcategories
            ],
        },
    }, 201


# GET CATEGORIES BY RESTAURANT
@admin_categories.get("/allcategories/<restaurant_id>")
def get_categories(restaurant_id):
    categories = Category.query.filter_by(restaurant_id=restaurant_id).all()
    return jsonify([c.to_dict() for c in categories])


# UPDATE CATEGORY
@admin_categories.patch("/update/<category_id>")
def update_category(category_id):
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid or missing JSON body"}), 400

    category = Category.query.get_or_404(category_id)

    updates = {}
    if "name" in data:
        old_name = category.name
        category.name = data["name"]
        updates["name_change"] = f"{old_name} -> {data['name']}"

    new_subcats = data.get("add_subcategories", [])
    if isinstance(new_subcats, list):
        added = []
        for sub_name in new_subcats:
            sub = Subcategory(name=sub_name, category_id=category.id)
            db.session.add(sub)
            added.append(sub_name)
        if added:
            updates["added_subcategories"] = added

    delete_subcats = data.get("delete_subcategories", [])
    if isinstance(delete_subcats, list):
        deleted = []
        for sub_id in delete_subcats:
            sub = Subcategory.query.filter_by(
                id=sub_id, category_id=category.id
            ).first()
            if sub:
                deleted.append(sub.name)
                db.session.delete(sub)
        if deleted:
            updates["deleted_subcategories"] = deleted

    db.session.commit()

    log_admin_action(
        action_type="update",
        object_type="category",
        object_id=category.id,
        details=updates,
    )

    return (
        jsonify(
            {
                "message": "Category updated",
                "category": {
                    "id": category.id,
                    "name": category.name,
                    "restaurant_id": category.restaurant_id,
                    "subcategories": [
                        {"id": s.id, "name": s.name} for s in category.subcategories
                    ],
                },
            }
        ),
        200,
    )


# DELETE CATEGORY
@admin_categories.delete("/delete/<category_id>")
def delete_category(category_id):
    category = Category.query.get_or_404(category_id)

    deleted_name = category.name

    db.session.delete(category)
    db.session.commit()

    log_admin_action(
        action_type="delete",
        object_type="category",
        object_id=category_id,
        details=f"Deleted category '{deleted_name}' and its subcategories",
    )

    return jsonify({"message": "Category deleted"})
