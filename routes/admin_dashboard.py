from datetime import timedelta

from flask import Blueprint, g, jsonify, request
from sqlalchemy import func

from models.activity import AuditLog, MenuView
from models.category import Category
from models.db import db
from models.item import Item, utcnow
from models.restaurant import Restaurant
from models.subcategory import Subcategory
from utils.admin_logger import log_admin_action
from utils import view_buffer
from utils.auth import require_owner

admin_dashboard = Blueprint("admin_dashboard", __name__)


def _pct_change(current, previous):
    if previous == 0:
        return None  # no baseline: the UI shows "new" instead of a percentage
    return round((current - previous) / previous * 100)


@admin_dashboard.get("/stats")
@require_owner
def stats():
    days = request.args.get("days", 14, type=int)
    days = days if days in (7, 14, 30, 90) else 14
    view_buffer.flush()  # include visits still buffered in this worker
    rid = g.owner.restaurant_id
    now = utcnow()

    items = (
        Item.query.join(Subcategory)
        .join(Category)
        .filter(Category.restaurant_id == rid)
        .all()
    )
    total = len(items)

    def discounted(state):
        count = 0
        for i in items:
            if not i.discount_type:
                continue
            if state == "active" and i.discount_is_active(now):
                count += 1
            elif state == "scheduled" and i.discount_starts_at and i.discount_starts_at > now:
                count += 1
            elif state == "expired" and i.discount_ends_at and i.discount_ends_at < now:
                count += 1
        return count

    with_image = sum(1 for i in items if i.image_url)
    with_description = sum(1 for i in items if (i.description or "").strip())
    quality = round(100 * (with_image + with_description) / (2 * total)) if total else 0
    prices = [i.price for i in items if i.price is not None]

    categories = Category.query.filter_by(restaurant_id=rid).all()
    empty_categories = sum(
        1 for c in categories if not any(sc.items for sc in c.subcategories)
    )

    # Views per day (UTC), zero-filled so the chart has no gaps.
    today = now.date()
    start = today - timedelta(days=2 * days - 1)  # also need the previous period
    rows = (
        db.session.query(func.date(MenuView.created_at), func.count(MenuView.id))
        .filter(MenuView.restaurant_id == rid, MenuView.created_at >= start)
        .group_by(func.date(MenuView.created_at))
        .all()
    )
    per_day = {str(d): c for d, c in rows}
    series = []
    for offset in range(days - 1, -1, -1):
        d = today - timedelta(days=offset)
        series.append({"date": d.isoformat(), "views": per_day.get(d.isoformat(), 0)})
    current = sum(p["views"] for p in series)
    previous = sum(
        per_day.get((today - timedelta(days=offset)).isoformat(), 0)
        for offset in range(days, 2 * days)
    )

    return jsonify(
        {
            "items": {
                "total": total,
                "available": sum(1 for i in items if i.is_available),
                "sold_out": sum(1 for i in items if not i.is_available),
                "average_price": round(sum(prices) / len(prices), 2) if prices else 0,
            },
            "promotions": {
                "active": discounted("active"),
                "scheduled": discounted("scheduled"),
                "expired": discounted("expired"),
            },
            "views": {
                "days": days,
                "total": current,
                "previous_total": previous,
                "change_percent": _pct_change(current, previous),
                "today": per_day.get(today.isoformat(), 0),
                "series": series,
            },
            "health": {
                "quality_score": quality,
                "missing_image": total - with_image,
                "missing_description": total - with_description,
                "sold_out": sum(1 for i in items if not i.is_available),
                "expired_promos": discounted("expired"),
                "empty_categories": empty_categories,
            },
            "categories": len(categories),
        }
    )


@admin_dashboard.get("/activity")
@require_owner
def activity():
    limit = min(request.args.get("limit", 20, type=int), 100)
    rows = (
        AuditLog.query.filter_by(restaurant_id=g.owner.restaurant_id)
        .order_by(AuditLog.id.desc())
        .limit(limit)
        .all()
    )
    return jsonify([r.to_dict() for r in rows])


@admin_dashboard.patch("/restaurant")
@require_owner
def update_restaurant():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    if not name:
        return jsonify({"error": "name is required"}), 400
    if len(name) > 120:
        return jsonify({"error": "name is too long"}), 400

    restaurant = db.session.get(Restaurant, g.owner.restaurant_id)
    old = restaurant.name
    restaurant.name = name
    db.session.commit()
    log_admin_action(
        "update",
        "restaurant",
        restaurant.id,
        {"old_name": old, "new_name": name},
        object_name=name,
    )
    return jsonify({"owner": g.owner.to_dict()})
