from .db import db

class Item(db.Model):
    __tablename__ = "items"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, nullable=False)
    description = db.Column(db.String)
    price = db.Column(db.Float)
    is_available = db.Column(db.Boolean, default=True, nullable=False)

    subcategory_id = db.Column(db.Integer, db.ForeignKey("subcategories.id"), nullable=False)