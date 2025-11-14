from .db import db

class Category(db.Model):
    __tablename__ = "categories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, nullable=False)

    restaurant_id = db.Column(db.Integer, db.ForeignKey("restaurants.id"), nullable=False)

    subcategories = db.relationship("Subcategory", backref="category", lazy=True)