from datetime import datetime, timezone

from .db import db


def _now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class AuditLog(db.Model):
    """Who changed what on a restaurant's menu (shown as the activity feed)."""

    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    restaurant_id = db.Column(db.Integer, db.ForeignKey("restaurants.id"), index=True)
    owner_email = db.Column(db.String)
    action_type = db.Column(db.String, nullable=False)  # create | update | delete | bulk
    object_type = db.Column(db.String, nullable=False)  # item | category | restaurant
    object_id = db.Column(db.String)
    object_name = db.Column(db.String)
    details = db.Column(db.Text)  # JSON
    created_at = db.Column(db.DateTime, default=_now, index=True)

    def to_dict(self):
        import json

        try:
            details = json.loads(self.details) if self.details else None
        except ValueError:
            details = None
        return {
            "id": self.id,
            "owner_email": self.owner_email,
            "action_type": self.action_type,
            "object_type": self.object_type,
            "object_id": self.object_id,
            "object_name": self.object_name,
            "details": details,
            "created_at": self.created_at.isoformat() + "Z",
        }


class MenuView(db.Model):
    """One customer opening the public menu (QR scan / link)."""

    __tablename__ = "menu_views"

    id = db.Column(db.Integer, primary_key=True)
    restaurant_id = db.Column(
        db.Integer, db.ForeignKey("restaurants.id"), nullable=False, index=True
    )
    created_at = db.Column(db.DateTime, default=_now, index=True)
