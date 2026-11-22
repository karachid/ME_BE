from datetime import datetime, timezone

from flask import Blueprint, g, jsonify, request
from sqlalchemy.orm import joinedload

from models.category import Category
from models.db import db
from models.item import DISCOUNT_TYPES, Item
from models.subcategory import Subcategory
from utils.admin_logger import log_admin_action
from utils.auth import require_owner

admin_items = Blueprint("admin_items", __name__)


def _owned_subcategory(subcategory_id):
    """Subcategory only if it belongs to the logged-in owner's restaurant."""
    return (
        Subcategory.query.join(Category)
        .filter(
            Subcategory.id == subcategory_id,
            Category.restaurant_id == g.owner.restaurant_id,
        )
        .first()
    )


def _owned_item(item_id):
    return (
        Item.query.join(Subcategory)
        .join(Category)
        .filter(Item.id == item_id, Category.restaurant_id == g.owner.restaurant_id)
        .first()
    )


def _parse_datetime(value):
    """ISO string -> naive UTC datetime (None/'' -> None). Raises ValueError."""
    if not value:
        return None
    parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return parsed


def _validate_price(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError("price must be a number")
    if value < 0:
        raise ValueError("price cannot be negative")
    return float(value)


def _apply_discount(item, discount):
    """Set or clear the discount. `discount` is None (clear) or a dict."""
    if discount is None:
        item.discount_type = None
        item.discount_value = None
        item.discount_starts_at = None
        item.discount_ends_at = None
        return

    if not isinstance(discount, dict):
        raise ValueError("discount must be an object or null")
    dtype = discount.get("type")
    value = discount.get("value")
    if dtype not in DISCOUNT_TYPES:
        raise ValueError("discount.type must be 'percent' or 'fixed'")
    if isinstance(value, bool) or not isinstance(value, (int, float)) or value <= 0:
        raise ValueError("discount.value must be a positive number")
    if dtype == "percent" and value > 100:
        raise ValueError("percent discount cannot exceed 100")
    if dtype == "fixed" and item.price is not None and value > item.price:
        raise ValueError("fixed discount cannot exceed the item price")

    starts = _parse_datetime(discount.get("starts_at"))
    ends = _parse_datetime(discount.get("ends_at"))
    if starts and ends and ends <= starts:
        raise ValueError("discount end must be after its start")

    item.discount_type = dtype
    item.discount_value = float(value)
    item.discount_starts_at = starts
    item.discount_ends_at = ends


# CREATE ITEM
@admin_items.post("/add")
@require_owner
def add_item():
    data = request.get_json(silent=True) or {}

    name = str(data.get("name", "")).strip()
    if not name:
        return jsonify({"error": "name is required"}), 400
    if _owned_subcategory(data.get("subcategory_id")) is None:
        return jsonify({"error": "Unknown subcategory"}), 400

    try:
        price = _validate_price(data.get("price"))
        item = Item(
            name=name,
            description=data.get("description", ""),
            price=price,
            is_available=bool(data.get("is_available", True)),
            image_url=data.get("image_url") or None,
            subcategory_id=data["subcategory_id"],
        )
        if "discount" in data:
            _apply_discount(item, data["discount"])
    except ValueError as err:
        return jsonify({"error": str(err)}), 400

    db.session.add(item)
    db.session.commit()

    log_admin_action(
        action_type="create",
        object_type="item",
        object_id=item.id,
        object_name=item.name,
        details={
            "name": item.name,
            "subcategory_id": item.subcategory_id,
            "price": item.price,
            "is_available": item.is_available,
        },
    )

    return jsonify({"message": "Item added", "item": item.to_dict()}), 201


# GET ALL ITEMS (of the logged-in owner's restaurant)
@admin_items.get("/allitems")
@require_owner
def get_all_items():
    items = (
        Item.query.join(Subcategory)
        .join(Category)
        .options(joinedload(Item.subcategory).joinedload(Subcategory.category))
        .filter(Category.restaurant_id == g.owner.restaurant_id)
        .order_by(Item.sort_order, Item.id)
        .all()
    )
    return jsonify([i.to_dict() for i in items])


# GET ITEMS BY SUBCATEGORY
@admin_items.get("/subcategory/<int:subcategory_id>")
@require_owner
def get_items(subcategory_id):
    if _owned_subcategory(subcategory_id) is None:
        return jsonify({"error": "Subcategory not found"}), 404
    items = (
        Item.query.filter_by(subcategory_id=subcategory_id)
        .order_by(Item.sort_order, Item.id)
        .all()
    )
    return jsonify([i.to_dict() for i in items])


# UPDATE ITEM (partial: only the provided fields change)
@admin_items.patch("/update/<int:item_id>")
@require_owner
def update_item(item_id):
    item = _owned_item(item_id)
    if not item:
        return jsonify({"error": "Item not found"}), 404

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid or missing JSON body"}), 400

    changes = {}

    try:
        if "name" in data:
            name = str(data["name"]).strip()
            if not name:
                raise ValueError("name cannot be empty")
            changes["old_name"], changes["new_name"] = item.name, name
            item.name = name

        if "description" in data:
            changes["old_description"] = item.description
            changes["new_description"] = data["description"]
            item.description = data["description"]

        if "price" in data:
            price = _validate_price(data["price"])
            changes["old_price"], changes["new_price"] = item.price, price
            item.price = price

        if "is_available" in data:
            changes["old_availability"] = item.is_available
            changes["new_availability"] = bool(data["is_available"])
            item.is_available = bool(data["is_available"])

        if "image_url" in data:
            item.image_url = data["image_url"] or None
            changes["image_url"] = item.image_url

        if "sort_order" in data:
            item.sort_order = int(data["sort_order"])

        if "subcategory_id" in data:
            if _owned_subcategory(data["subcategory_id"]) is None:
                raise ValueError("Unknown subcategory")
            changes["old_subcategory_id"] = item.subcategory_id
            changes["new_subcategory_id"] = data["subcategory_id"]
            item.subcategory_id = data["subcategory_id"]

        # Also re-validate an existing fixed discount if only the price changed.
        if "discount" in data:
            _apply_discount(item, data["discount"])
            changes["discount"] = data["discount"]
        elif "price" in data and item.discount_type == "fixed":
            if item.discount_value > item.price:
                raise ValueError(
                    "price is lower than the current fixed discount: "
                    "remove or reduce the discount first"
                )
    except (ValueError, TypeError) as err:
        db.session.rollback()
        return jsonify({"error": str(err)}), 400

    db.session.commit()

    log_admin_action(
        action_type="update",
        object_type="item",
        object_id=item.id,
        object_name=item.name,
        details=changes,
    )

    return jsonify({"message": "Item updated successfully", "item": item.to_dict()})


# DELETE ITEM
@admin_items.delete("/delete/<int:item_id>")
@require_owner
def delete_item(item_id):
    item = _owned_item(item_id)
    if not item:
        return jsonify({"error": "Item not found"}), 404
    deleted_name = item.name
    db.session.delete(item)
    db.session.commit()

    log_admin_action(
        action_type="delete",
        object_type="item",
        object_id=item_id,
        object_name=deleted_name,
        details=f"Deleted item '{deleted_name}'",
    )

    return jsonify({"message": "Item deleted"})


# BULK ACTIONS: change many items at once (all-or-nothing)
@admin_items.post("/bulk")
@require_owner
def bulk_update():
    data = request.get_json(silent=True) or {}
    ids = data.get("ids")
    action = data.get("action")
    if not isinstance(ids, list) or not ids or not all(isinstance(i, int) for i in ids):
        return jsonify({"error": "ids must be a non-empty list of item ids"}), 400
    if len(ids) > 500:
        return jsonify({"error": "too many items"}), 400

    items = (
        Item.query.join(Subcategory)
        .join(Category)
        .filter(Item.id.in_(ids), Category.restaurant_id == g.owner.restaurant_id)
        .all()
    )
    if len(items) != len(set(ids)):
        return jsonify({"error": "Some items were not found"}), 404

    try:
        if action == "availability":
            flag = data.get("is_available")
            if not isinstance(flag, bool):
                raise ValueError("is_available must be true or false")
            for item in items:
                item.is_available = flag
            details = {"is_available": flag}

        elif action == "price":
            mode, value = data.get("mode"), data.get("value")
            if mode not in ("percent", "fixed"):
                raise ValueError("mode must be 'percent' or 'fixed'")
            if isinstance(value, bool) or not isinstance(value, (int, float)):
                raise ValueError("value must be a number")
            for item in items:
                base = item.price or 0
                new = base * (1 + value / 100) if mode == "percent" else base + value
                if new < 0:
                    raise ValueError(f"'{item.name}' would get a negative price")
                item.price = round(new, 2)
                # keep an existing fixed discount valid
                if item.discount_type == "fixed" and item.discount_value > item.price:
                    raise ValueError(
                        f"'{item.name}': price would drop below its fixed discount"
                    )
            details = {"mode": mode, "value": value}

        elif action == "discount":
            discount = data.get("discount")
            for item in items:
                _apply_discount(item, discount)  # None clears
            details = {"discount": discount}

        else:
            raise ValueError("Unknown action")
    except (ValueError, TypeError) as err:
        db.session.rollback()
        return jsonify({"error": str(err)}), 400

    db.session.commit()
    log_admin_action(
        action_type="bulk",
        object_type="item",
        details={"action": action, "count": len(items), **details},
        object_name=f"{len(items)} items",
    )
    return jsonify({"items": [i.to_dict() for i in items]})
