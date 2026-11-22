import time

from flask import Blueprint, abort, jsonify, request
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from models.category import Category
from models.db import db
from models.restaurant import Restaurant
from models.subcategory import Subcategory
from utils import view_buffer

menu_routes = Blueprint("menu_routes", __name__)

# How long browsers and CDNs may reuse a menu response. An owner's change shows up
# to customers within this window (the owner's own preview bypasses the cache).
MENU_CACHE_SECONDS = 30
MENU_STALE_SECONDS = 60


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


def _load_menu_tree(restaurant_id):
    """The whole menu in 4 queries (restaurant, categories, subcategories, items)."""
    restaurant = db.session.execute(
        select(Restaurant)
        .where(Restaurant.id == restaurant_id)
        .options(
            selectinload(Restaurant.categories)
            .selectinload(Category.subcategories)
            .selectinload(Subcategory.items)
        )
    ).scalar_one_or_none()
    if restaurant is None:
        abort(404)
    return restaurant


@menu_routes.get("/restaurants/<int:restaurant_id>/menu/full")
def get_full_menu(restaurant_id):
    """Public customer menu: categories > subcategories > items, with live prices.

    Unavailable items are included (flagged) so the page can show them as sold out.
    Cacheable: same for every visitor, so a CDN can absorb almost all the traffic.
    """
    restaurant = _load_menu_tree(restaurant_id)

    categories = []
    for cat in restaurant.categories:
        subcategories = []
        for sc in cat.subcategories:
            items = sorted(sc.items, key=lambda i: (i.sort_order or 0, i.id))
            if items:
                subcategories.append(
                    {
                        "id": sc.id,
                        "name": sc.name,
                        "items": [i.public_dict() for i in items],
                    }
                )
        if subcategories:
            categories.append(
                {"id": cat.id, "name": cat.name, "subcategories": subcategories}
            )

    response = jsonify(
        {
            "restaurant_id": restaurant.id,
            "name": (restaurant.name or "").strip(),
            "categories": categories,
        }
    )

    if request.args.get("preview") == "1":
        # The owner checking their own changes must always see the latest.
        response.headers["Cache-Control"] = "no-store"
        return response

    response.headers["Cache-Control"] = (
        f"public, max-age={MENU_CACHE_SECONDS}, "
        f"stale-while-revalidate={MENU_STALE_SECONDS}"
    )
    # A validator lets clients (and the CDN) revalidate cheaply: 304, no body.
    response.add_etag()
    return response.make_conditional(request)


# One count per visitor (IP) per restaurant per 30 minutes, so refreshes and
# bots do not inflate the numbers. In-memory, per process: fine for one server.
_recent_views = {}
_VIEW_WINDOW = 30 * 60


@menu_routes.post("/restaurants/<int:restaurant_id>/view")
def record_view(restaurant_id):
    if db.session.get(Restaurant, restaurant_id) is None:
        abort(404)
    key = (request.remote_addr, restaurant_id)
    now = time.time()
    if now - _recent_views.get(key, 0) < _VIEW_WINDOW:
        return {"counted": False}
    if len(_recent_views) > 5000:  # keep memory bounded
        _recent_views.clear()
    _recent_views[key] = now
    # Buffered and written in batches: the scan never waits on a database write.
    view_buffer.add(restaurant_id)
    return {"counted": True}
