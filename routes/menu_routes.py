from flask import Blueprint
from models.restaurant import Restaurant

menu_routes = Blueprint("menu_routes", __name__)


@menu_routes.get("/restaurants/<int:restaurant_id>/menu")
def get_menu_tree(restaurant_id):
    restaurant = Restaurant.query.get_or_404(restaurant_id)

    response = {
        "restaurant_id": restaurant.id,
        "name": restaurant.name,
        "categories": [],
    }

    for cat in restaurant.categories:
        response["categories"].append(
            {
                "id": cat.id,
                "name": cat.name,
                "subcategories": [
                    {"id": sc.id, "name": sc.name} for sc in cat.subcategories
                ],
            }
        )

    return response
