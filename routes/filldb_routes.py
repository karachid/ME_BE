from flask import Blueprint, jsonify
from models.db import db
from models.restaurant import Restaurant
from models.category import Category
from models.subcategory import Subcategory
from models.item import Item

filldb_routes = Blueprint("filldb_routes", __name__)


categories_data = [
    {
        "name": "Boissons Froides",
        "subcategories": [
            {"name": "Jus"},
            {"name": "Mocktails"},
            {"name": "Milkshakes"},
            {"name": "Eaux minérales & gazeuses"},
        ],
    },
    {"name": "À la Carte", "subcategories": []},
    {"name": "Focaccias artisanales", "subcategories": []},
    {"name": "Formules Goutte", "subcategories": []},
    {
        "name": "Boissons Chaudes",
        "subcategories": [
            {"name": "Cafés"},
            {"name": "Chocolats chauds"},
            {"name": "Thés & Infusions"},
        ],
    },
    {"name": "Sandwiches", "subcategories": []},
    {"name": "Crêpes / Pancakes / Gaufres", "subcategories": []},
    {"name": "Petit Déjeuner", "subcategories": []},
    {"name": "Salades", "subcategories": []},
    {"name": "Pasta", "subcategories": []},
    {"name": "Glaces", "subcategories": []},
]

items_data = [
    {
        "name": "Pesto Tagliatelle Fruit de Mer",
        "description": "Tagliatelle with pesto and seafood",
        "price": 54,
        "category": "Pasta",
        "available": True,
    },
    {
        "name": "Supreme",
        "description": "Thon Sauce tomate, mozzarella, Olive, champignon, poivron et oignon",
        "price": 42,
        "category": "Focaccias artisanales",
        "available": True,
    },
    {
        "name": "Poulet Avocat Wrap",
        "description": "",
        "price": 42,
        "category": "Sandwiches",
        "available": True,
    },
    {
        "name": "Club Sandiwich",
        "description": "",
        "price": 36,
        "category": "Sandwiches",
        "available": True,
    },
    {
        "name": "Crêpe Banane Nutella",
        "description": "",
        "price": 26,
        "category": "Crêpes / Pancakes / Gaufres",
        "available": True,
    },
    {
        "name": "Pain Perdu Caramel Beurre Sale",
        "description": "",
        "price": 32,
        "category": "Crêpes / Pancakes / Gaufres",
        "available": True,
    },
    {
        "name": "Espresso",
        "description": "",
        "price": 18,
        "category": "Cafés",
        "available": True,
    },
    {
        "name": "Double Espresso",
        "description": "",
        "price": 28,
        "category": "Cafés",
        "available": True,
    },
    {
        "name": "Latte Macchiato Vanille",
        "description": "",
        "price": 24,
        "category": "Cafés",
        "available": True,
    },
    {
        "name": "Latte Macchiato Volsette",
        "description": "",
        "price": 24,
        "category": "Cafés",
        "available": True,
    },
    {
        "name": "Verveine",
        "description": "",
        "price": 16,
        "category": "Thés & Infusions",
        "available": True,
    },
    {
        "name": "Thé Glacé Citron",
        "description": "",
        "price": 28,
        "category": "Jus",
        "available": True,
    },
    {
        "name": "Mocktail Mojito",
        "description": "",
        "price": 24,
        "category": "Mocktails",
        "available": True,
    },
    {
        "name": "Mocktail Mojito Fruits Rouges",
        "description": "",
        "price": 26,
        "category": "Mocktails",
        "available": True,
    },
    {
        "name": "Mocktail Mojito Fruit de la Passion",
        "description": "",
        "price": 26,
        "category": "Mocktails",
        "available": True,
    },
    {
        "name": "Mocktail Gacia",
        "description": "",
        "price": 28,
        "category": "Mocktails",
        "available": True,
    },
    {
        "name": "Viennois",
        "description": "Jus d'orange ou Jus de carotte, Boisson chaude au choix, Corbeille du Boulanger",
        "price": 32,
        "category": "Petit Déjeuner",
        "available": True,
    },
    {
        "name": "Tartine Verde",
        "description": "Deux œufs poches, avocat, epinard, et graines.",
        "price": 30,
        "category": "À la Carte",
        "available": True,
    },
    {
        "name": "Trois Boulés (À Emporter)",
        "description": "3 scoops of ice cream (takeaway)",
        "price": 18,
        "category": "Glaces",
        "available": True,
    },
    {
        "name": "Margherita",
        "description": "Sauce tomate, mozzarella, basilic frais",
        "price": 35,
        "category": "Focaccias artisanales",
        "available": True,
    },
    {
        "name": "Gacia Burger Champignon",
        "description": "",
        "price": 49,
        "category": "Sandwiches",
        "available": True,
    },
    {
        "name": "Ciabatta Pesto Poulet",
        "description": "",
        "price": 42,
        "category": "Sandwiches",
        "available": True,
    },
    {
        "name": "Crêpe Nutella",
        "description": "",
        "price": 24,
        "category": "Crêpes / Pancakes / Gaufres",
        "available": True,
    },
    {
        "name": "Gaufre Caramel Beurre Sale",
        "description": "Waffle with chocolate and red fruits",
        "price": 26,
        "category": "Crêpes / Pancakes / Gaufres",
        "available": True,
    },
    {
        "name": "Goutte patissiere",
        "description": "Dessert patissier + Boisson chaude ou jus",
        "price": 32,
        "category": "Formules Goutte",
        "available": True,
    },
    {
        "name": "Eau Plate",
        "description": "",
        "price": 8,
        "category": "Eaux minérales & gazeuses",
        "available": True,
    },
    {
        "name": "Eau Gazeuse",
        "description": "",
        "price": 14,
        "category": "Eaux minérales & gazeuses",
        "available": True,
    },
    {
        "name": "Cappuccino",
        "description": "",
        "price": 28,
        "category": "Cafés",
        "available": True,
    },
    {
        "name": "Latte Macchiato Cinnamon",
        "description": "",
        "price": 24,
        "category": "Cafés",
        "available": True,
    },
    {
        "name": "Infusion Naturelle",
        "description": "À voir avec votre serveur",
        "price": 28,
        "category": "Thés & Infusions",
        "available": True,
    },
    {
        "name": "Thé Glacé Pêche",
        "description": "",
        "price": 28,
        "category": "Jus",
        "available": True,
    },
    {
        "name": "Milkshake Fraise Vanille",
        "description": "",
        "price": 32,
        "category": "Milkshakes",
        "available": True,
    },
    {
        "name": "Jus Carotte Orange",
        "description": "",
        "price": 28,
        "category": "Jus",
        "available": True,
    },
    {
        "name": "Jus de Citron",
        "description": "",
        "price": 28,
        "category": "Jus",
        "available": True,
    },
    {
        "name": "Jus Citron Gingembre",
        "description": "",
        "price": 28,
        "category": "Jus",
        "available": True,
    },
    {
        "name": "Jus de Mangue",
        "description": "",
        "price": 26,
        "category": "Jus",
        "available": True,
    },
    {
        "name": "Jus d'Ananas",
        "description": "",
        "price": 26,
        "category": "Jus",
        "available": True,
    },
    {
        "name": "Jus de Fraise",
        "description": "",
        "price": 26,
        "category": "Jus",
        "available": True,
    },
    {
        "name": "Supplement khili",
        "description": "",
        "price": 12,
        "category": "À la Carte",
        "available": True,
    },
    {
        "name": "Jambon de Dinde",
        "description": "",
        "price": 20,
        "category": "À la Carte",
        "available": True,
    },
    {
        "name": "Glace (1kg)",
        "description": "1kg of ice cream",
        "price": 100,
        "category": "Glaces",
        "available": True,
    },
    {
        "name": "Folie Cookie",
        "description": "Amande caramélisées, glace cookie, chantilly, coulant, cookie moelleux",
        "price": 42,
        "category": "Glaces",
        "available": True,
    },
    {
        "name": "Pavlova Manga",
        "description": "Meringue, Sorbet mangue, Chantilly",
        "price": 42,
        "category": "Glaces",
        "available": True,
    },
    {
        "name": "Fraisier",
        "description": "Sorbet Citron, sauce fraise, Chantilly",
        "price": 42,
        "category": "Glaces",
        "available": True,
    },
    {
        "name": "Quinoa Exotique",
        "description": "Avocat, fruits secs, fruits de saison",
        "price": 42,
        "category": "Salades",
        "available": True,
    },
    {
        "name": "Alfredo Penne Champignon Poulet",
        "description": "Penne Alfredo sauce, champignons & poulet",
        "price": 49,
        "category": "Pasta",
        "available": True,
    },
    {
        "name": "Poulet Champignon",
        "description": "Poulet, crème, mozzarella, champignon frais",
        "price": 46,
        "category": "Focaccias artisanales",
        "available": True,
    },
    {
        "name": "Cheese Burger",
        "description": "",
        "price": 42,
        "category": "Sandwiches",
        "available": True,
    },
    {
        "name": "Gaufre Chocolat Fruit Rouge",
        "description": "Waffle with chocolate and red fruits",
        "price": 32,
        "category": "Crêpes / Pancakes / Gaufres",
        "available": True,
    },
    {
        "name": "Café gourmand",
        "description": "Boisson chaude, sélection de 3 mignardises",
        "price": 32,
        "category": "Formules Goutte",
        "available": True,
    },
    {
        "name": "Goutte Gacia",
        "description": "Crêpe ou Gaufre + Boisson",
        "price": 42,
        "category": "Formules Goutte",
        "available": True,
    },
    {
        "name": "Soda",
        "description": "",
        "price": 14,
        "category": "Eaux minérales & gazeuses",
        "available": True,
    },
    {
        "name": "Café Crème",
        "description": "",
        "price": 28,
        "category": "Cafés",
        "available": True,
    },
    {
        "name": "Chocolat Chaud",
        "description": "",
        "price": 24,
        "category": "Chocolats chauds",
        "available": True,
    },
    {
        "name": "Jus d'Orange",
        "description": "",
        "price": 28,
        "category": "Jus",
        "available": True,
    },
    {
        "name": "Le Bladi",
        "description": "Jus + Boisson + Tagine Khili + Crêpes Marocaines",
        "price": 49,
        "category": "Petit Déjeuner",
        "available": True,
    },
    {
        "name": "Gacia",
        "description": "Petit déjeuner complet : jus, boisson chaude, fruits, œufs, viennoiseries",
        "price": 59,
        "category": "Petit Déjeuner",
        "available": True,
    },
    {
        "name": "Tartine de Campagne",
        "description": "œufs brouillés, sauce champignon, pesto, tomate confite",
        "price": 30,
        "category": "À la Carte",
        "available": True,
    },
]


@filldb_routes.route("/filldb", methods=["POST"])
def fill_db():
    # Reset database
    db.drop_all()
    db.create_all()

    # Create restaurant
    restaurant = Restaurant(name="Gacia dessert room ")
    db.session.add(restaurant)
    db.session.commit()

    # -------- CREATE CATEGORIES & SUBCATEGORIES ----------
    category_map = {}  # e.g. {"Pasta": <Category>}
    subcategory_map = {}  # e.g. {"Cafés": <Subcategory>}

    for cat in categories_data:
        category = Category(name=cat["name"], restaurant_id=restaurant.id)
        db.session.add(category)
        db.session.flush()  # ensures category.id is available

        category_map[cat["name"]] = category

        # Add subcategories
        for sc in cat["subcategories"]:
            subcategory = Subcategory(name=sc["name"], category_id=category.id)
            db.session.add(subcategory)
            db.session.flush()

            subcategory_map[sc["name"]] = subcategory

    db.session.commit()

    # -------- INSERT ITEMS ----------
    items_to_add = []

    for item in items_data:
        cat_name = item["category"]

        # Case 1 : category matches a SUBCATEGORY
        subcat = subcategory_map.get(cat_name)

        # Case 2 : category matches a CATEGORY directly (no subcategories)
        if subcat is None:
            category = category_map.get(cat_name)
            if not category:
                print("Unknown category:", cat_name)
                continue

            # For items attached directly to categories without subcategories
            # I create a special implicit subcategory
            subcat = Subcategory(name=cat_name, category_id=category.id)
            db.session.add(subcat)
            db.session.flush()
            subcategory_map[cat_name] = subcat

        new_item = Item(
            name=item["name"],
            description=item["description"],
            price=item["price"],
            is_available=item["available"],
            subcategory_id=subcat.id,
        )

        items_to_add.append(new_item)

    db.session.add_all(items_to_add)
    db.session.commit()

    return jsonify({"message": "Database filled successfully!"})
