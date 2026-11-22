from datetime import datetime, timezone

from .db import db

DISCOUNT_TYPES = ("percent", "fixed")


def utcnow():
    """Naive UTC 'now' (all datetimes in the DB are naive UTC)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Item(db.Model):
    __tablename__ = "items"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, nullable=False)
    description = db.Column(db.String)
    price = db.Column(db.Float)
    is_available = db.Column(db.Boolean, default=True, nullable=False)
    image_url = db.Column(db.String)
    sort_order = db.Column(db.Integer, default=0)

    # Discount: "percent" (0-100) or "fixed" (MAD off). Optional validity window.
    discount_type = db.Column(db.String)
    discount_value = db.Column(db.Float)
    discount_starts_at = db.Column(db.DateTime)
    discount_ends_at = db.Column(db.DateTime)

    subcategory_id = db.Column(
        db.Integer, db.ForeignKey("subcategories.id"), nullable=False
    )

    def discount_is_active(self, now=None):
        if not self.discount_type or not self.discount_value:
            return False
        now = now or utcnow()
        if self.discount_starts_at and now < self.discount_starts_at:
            return False
        if self.discount_ends_at and now > self.discount_ends_at:
            return False
        return True

    def final_price(self, now=None):
        """Price the customer pays right now (base price minus active discount)."""
        if self.price is None:
            return None
        if not self.discount_is_active(now):
            return self.price
        if self.discount_type == "percent":
            result = self.price * (1 - self.discount_value / 100)
        else:
            result = self.price - self.discount_value
        return round(max(result, 0), 2)

    def discount_dict(self):
        if not self.discount_type:
            return None
        return {
            "type": self.discount_type,
            "value": self.discount_value,
            "starts_at": _iso(self.discount_starts_at),
            "ends_at": _iso(self.discount_ends_at),
            "active": self.discount_is_active(),
        }

    def public_dict(self):
        """What a customer may see."""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "price": self.price,
            "final_price": self.final_price(),
            "discount_active": self.discount_is_active(),
            "is_available": self.is_available,
            "image_url": self.image_url,
        }

    def to_dict(self):
        sub = self.subcategory
        cat = sub.category if sub else None

        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "price": self.price,
            "final_price": self.final_price(),
            "is_available": self.is_available,
            "image_url": self.image_url,
            "sort_order": self.sort_order,
            "discount": self.discount_dict(),
            "subcategory_id": sub.id if sub else None,
            "subcategory_name": sub.name if sub else None,
            "category_id": cat.id if cat else None,
            "category_name": cat.name if cat else None,
        }


def _iso(value):
    # Stored as naive UTC; the trailing Z lets browsers parse it unambiguously.
    return value.isoformat() + "Z" if value else None
