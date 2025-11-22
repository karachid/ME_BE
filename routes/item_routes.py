from flask import Blueprint
from models.subcategory import Subcategory

item_routes = Blueprint("item_routes", __name__)


@item_routes.get("/subcategories/<int:subcat_id>/items")
def get_items(subcat_id):
    subcat = Subcategory.query.get_or_404(subcat_id)

    return {
        "subcategory_id": subcat_id,
        "items": [
            {
                "id": item.id,
                "name": item.name,
                "description": item.description,
                "price": item.price,
                "is_available": item.is_available,
            }
            for item in subcat.items
        ],
    }
