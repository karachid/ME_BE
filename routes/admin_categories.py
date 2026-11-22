from flask import Blueprint, g, jsonify, request
from sqlalchemy.orm import selectinload

from models.category import Category
from models.db import db
from models.subcategory import Subcategory
from utils.admin_logger import log_admin_action
from utils.auth import require_owner

admin_categories = Blueprint("admin_categories", __name__)


def _owned_category(category_id):
    return Category.query.filter_by(
        id=category_id, restaurant_id=g.owner.restaurant_id
    ).first()


# CREATE CATEGORY (always in the logged-in owner's restaurant)
@admin_categories.post("/add")
@require_owner
def add_category():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    subcategories_list = data.get("subcategories", [])

    if not name:
        return {"error": "Name is required"}, 400

    category = Category(name=name, restaurant_id=g.owner.restaurant_id)
    db.session.add(category)
    db.session.flush()  # Get category.id before commit

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
        object_name=category.name,
        details=f"Created category '{name}' with subcategories: {created_subcats}",
    )

    return {
        "message": "Category created successfully",
        "category": category.to_dict(),
    }, 201


# GET CATEGORIES BY RESTAURANT (only the owner's own restaurant)
@admin_categories.get("/allcategories/<int:restaurant_id>")
@require_owner
def get_categories(restaurant_id):
    if restaurant_id != g.owner.restaurant_id:
        return jsonify({"error": "Forbidden"}), 403
    categories = (
        Category.query.filter_by(restaurant_id=restaurant_id)
        .options(selectinload(Category.subcategories).selectinload(Subcategory.items))
        .all()
    )
    return jsonify([c.to_dict() for c in categories])


# UPDATE CATEGORY
@admin_categories.patch("/update/<int:category_id>")
@require_owner
def update_category(category_id):
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid or missing JSON body"}), 400

    category = _owned_category(category_id)
    if not category:
        return jsonify({"error": "Category not found"}), 404

    updates = {}
    if "name" in data:
        name = str(data["name"]).strip()
        if not name:
            return jsonify({"error": "name cannot be empty"}), 400
        updates["name_change"] = f"{category.name} -> {name}"
        # A category with no real subcategories holds its items in a default
        # subcategory that shares its name: keep the two in step.
        for sub in category.subcategories:
            if sub.name == category.name:
                sub.name = name
        category.name = name

    new_subcats = data.get("add_subcategories", [])
    if isinstance(new_subcats, list):
        added = []
        for sub_name in new_subcats:
            if not isinstance(sub_name, str) or not sub_name.strip():
                continue
            db.session.add(Subcategory(name=sub_name.strip(), category_id=category.id))
            added.append(sub_name.strip())
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
                if sub.items:
                    db.session.rollback()
                    return (
                        jsonify(
                            {
                                "error": f"'{sub.name}' still has {len(sub.items)} item(s): move or delete them first",
                                "code": "category_not_empty",
                            }
                        ),
                        409,
                    )
                deleted.append(sub.name)
                db.session.delete(sub)
        if deleted:
            updates["deleted_subcategories"] = deleted

    db.session.commit()

    log_admin_action(
        action_type="update",
        object_type="category",
        object_id=category.id,
        object_name=category.name,
        details=updates,
    )

    return jsonify({"message": "Category updated", "category": category.to_dict()})


# DELETE CATEGORY
@admin_categories.delete("/delete/<int:category_id>")
@require_owner
def delete_category(category_id):
    category = _owned_category(category_id)
    if not category:
        return jsonify({"error": "Category not found"}), 404

    deleted_name = category.name

    count = sum(len(sc.items) for sc in category.subcategories)
    if count:
        return (
            jsonify(
                {
                    "error": f"Category still has {count} item(s): move or delete them first",
                    "code": "category_not_empty",
                    "item_count": count,
                }
            ),
            409,
        )

    db.session.delete(category)
    db.session.commit()

    log_admin_action(
        action_type="delete",
        object_type="category",
        object_id=category_id,
        object_name=deleted_name,
        details=f"Deleted category '{deleted_name}' and its subcategories",
    )

    return jsonify({"message": "Category deleted"})
