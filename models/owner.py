from datetime import datetime, timezone

from werkzeug.security import check_password_hash, generate_password_hash

from .db import db


class Owner(db.Model):
    """A restaurant owner who can log in and manage one restaurant's menu."""

    __tablename__ = "owners"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String, unique=True, nullable=False)
    password_hash = db.Column(db.String, nullable=False)
    restaurant_id = db.Column(
        db.Integer, db.ForeignKey("restaurants.id"), nullable=False
    )
    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None)
    )

    restaurant = db.relationship("Restaurant", lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "restaurant": {
                "id": self.restaurant.id,
                "name": (self.restaurant.name or "").strip(),
            },
        }
