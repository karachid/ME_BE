from .db import db


class Restaurant(db.Model):
    __tablename__ = "restaurants"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, nullable=False)

    categories = db.relationship("Category", backref="restaurant", lazy=True)
