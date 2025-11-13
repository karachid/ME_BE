from flask import Flask, jsonify

app = Flask(__name__)

@app.route("/")
def home():
    return jsonify({"message": "Welcome to MenuXpert API 🚀"})

@app.route("/menu")
def get_menu():
    menu = {
        "restaurant": "Café du Soleil",
        "categories": [
            {
                "name": "Starters",
                "items": [
                    {"name": "Bruschetta", "price": 5.5, "description": "Grilled bread with tomato & basil"},
                    {"name": "Soup of the Day", "price": 4.0, "description": "Freshly prepared daily soup"}
                ]
            },
            {
                "name": "Main Dishes",
                "items": [
                    {"name": "Spaghetti Carbonara", "price": 11.0, "description": "Classic Italian pasta"},
                    {"name": "Grilled Chicken", "price": 13.5, "description": "Served with fries and salad"}
                ]
            },
            {
                "name": "Desserts",
                "items": [
                    {"name": "Tiramisu", "price": 6.0, "description": "Homemade Italian dessert"},
                    {"name": "Ice Cream Trio", "price": 5.0, "description": "Three scoops of your choice"}
                ]
            }
        ]
    }
    return jsonify(menu)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
