from .db import db

class Category(db.Model):
    __tablename__ = "categories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, nullable=False)

    restaurant_id = db.Column(db.Integer, db.ForeignKey("restaurants.id"), nullable=False)

    subcategories = db.relationship("Subcategory", backref="category", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "restaurant_id": self.restaurant_id,
            "subcategories": [
                {"id": sc.id, "name": sc.name} for sc in self.subcategories
            ]
        }