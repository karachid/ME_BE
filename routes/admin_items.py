from flask import Blueprint, request, jsonify
from models.db import db
from models.item import Item

admin_items = Blueprint("admin_items", __name__)

# CREATE ITEM
@admin_items.post("/")
def add_item():
    data = request.json

    item = Item(
        name=data["name"],
        description=data.get("description", ""),
        price=data["price"],
        is_available=data.get("is_available", True),
        subcategory_id=data["subcategory_id"]
    )

    db.session.add(item)
    db.session.commit()

    return jsonify({"message": "Item added", "item": item.to_dict()})

# GET ALL ITEMS
@admin_items.get("/allitems")
def get_all_items():
    items = Item.query.all()

    result = []
    for item in items:
        subcat = item.subcategory
        cat = subcat.category if subcat else None

        result.append({
            "id": item.id,
            "name": item.name,
            "description": item.description,
            "price": item.price,
            "is_available": item.is_available,
            "subcategory_id": subcat.id if subcat else None,
            "subcategory_name": subcat.name if subcat else None,
            "category_id": cat.id if cat else None,
            "category_name": cat.name if cat else None,
        })

    return jsonify(result)


# GET ITEMS BY SUBCATEGORY
@admin_items.get("/subcategory/<subcategory_id>")
def get_items(subcategory_id):
    items = Item.query.filter_by(subcategory_id=subcategory_id).all()
    return jsonify([i.to_dict() for i in items])

# UPDATE ITEM
@admin_items.put("/<item_id>")
def update_item(item_id):
    item = Item.query.get_or_404(item_id)
    data = request.json

    item.name = data.get("name", item.name)
    item.description = data.get("description", item.description)
    item.price = data.get("price", item.price)
    item.is_available = data.get("is_available", item.is_available)

    db.session.commit()

    return jsonify({"message": "Item updated", "item": item.to_dict()})

# DELETE ITEM
@admin_items.delete("/<item_id>")
def delete_item(item_id):
    item = Item.query.get_or_404(item_id)
    db.session.delete(item)
    db.session.commit()

    return jsonify({"message": "Item deleted"})