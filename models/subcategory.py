from .db import db

class Subcategory(db.Model):
    __tablename__ = "subcategories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, nullable=False)

    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=False)

    items = db.relationship("Item", backref="subcategory", lazy=True)