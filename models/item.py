from .db import db


class Item(db.Model):
    __tablename__ = "items"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, nullable=False)
    description = db.Column(db.String)
    price = db.Column(db.Float)
    is_available = db.Column(db.Boolean, default=True, nullable=False)

    subcategory_id = db.Column(
        db.Integer, db.ForeignKey("subcategories.id"), nullable=False
    )

    def to_dict(self):
        sub = self.subcategory
        cat = sub.category if sub else None

        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "price": self.price,
            "is_available": self.is_available,
            "subcategory_id": sub.id if sub else None,
            "subcategory_name": sub.name if sub else None,
            "category_id": cat.id if cat else None,
            "category_name": cat.name if cat else None,
        }
