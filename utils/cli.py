import click
from flask.cli import with_appcontext

from models.db import db
from models.owner import Owner
from models.restaurant import Restaurant


@click.command("create-owner")
@click.argument("email")
@click.argument("password")
@click.option("--restaurant-id", type=int, help="Attach to an existing restaurant.")
@click.option("--restaurant-name", help="Create a new restaurant with this name.")
@with_appcontext
def create_owner(email, password, restaurant_id, restaurant_name):
    """Create an owner login: flask --app app create-owner EMAIL PASSWORD ..."""
    email = email.strip().lower()
    if len(password) < 8:
        raise click.ClickException("Password must be at least 8 characters.")
    if Owner.query.filter_by(email=email).first():
        raise click.ClickException(f"Owner {email} already exists.")

    if restaurant_id:
        restaurant = db.session.get(Restaurant, restaurant_id)
        if restaurant is None:
            raise click.ClickException(f"Restaurant {restaurant_id} not found.")
    elif restaurant_name:
        restaurant = Restaurant(name=restaurant_name)
        db.session.add(restaurant)
        db.session.flush()
    else:
        raise click.ClickException("Give --restaurant-id or --restaurant-name.")

    owner = Owner(email=email, restaurant_id=restaurant.id)
    owner.set_password(password)
    db.session.add(owner)
    db.session.commit()
    click.echo(f"Owner {email} created for restaurant #{restaurant.id}.")
