from datetime import datetime, timedelta, timezone


def iso(delta_hours):
    moment = datetime.now(timezone.utc) + timedelta(hours=delta_hours)
    return moment.isoformat()


# ---------- auth ----------


def test_login_ok_and_me(client):
    res = client.post(
        "/auth/login", json={"email": "A@test.ma ", "password": "password123"}
    )
    assert res.status_code == 200
    token = res.get_json()["token"]
    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.get_json()["owner"]["restaurant"]["name"] == "Resto A"


def test_login_wrong_password(client):
    res = client.post("/auth/login", json={"email": "a@test.ma", "password": "nope"})
    assert res.status_code == 401


def test_admin_routes_require_token(client, app):
    item_id = app.ids["a"]["item"]
    assert client.get("/admin/items/allitems").status_code == 401
    assert client.patch(f"/admin/items/update/{item_id}", json={"price": 1}).status_code == 401
    assert client.delete(f"/admin/items/delete/{item_id}").status_code == 401
    assert client.post("/admin/categories/add", json={"name": "x"}).status_code == 401
    bad = {"Authorization": "Bearer not-a-token"}
    assert client.get("/admin/items/allitems", headers=bad).status_code == 401


def test_filldb_disabled_by_default(client):
    assert client.post("/db/filldb").status_code == 404


# ---------- ownership scoping ----------


def test_owner_only_sees_own_items(client, auth):
    items = client.get("/admin/items/allitems", headers=auth).get_json()
    assert len(items) == 1


def test_cannot_touch_other_restaurants_item(client, auth, app):
    other = app.ids["b"]["item"]
    assert client.patch(f"/admin/items/update/{other}", json={"price": 1}, headers=auth).status_code == 404
    assert client.delete(f"/admin/items/delete/{other}", headers=auth).status_code == 404


def test_cannot_add_item_to_other_restaurants_subcategory(client, auth, app):
    res = client.post(
        "/admin/items/add",
        json={"name": "Hack", "price": 1, "subcategory_id": app.ids["b"]["sub"]},
        headers=auth,
    )
    assert res.status_code == 400


def test_categories_scoped(client, auth, app):
    other_resto = app.ids["b"]["restaurant"]
    assert client.get(f"/admin/categories/allcategories/{other_resto}", headers=auth).status_code == 403
    created = client.post("/admin/categories/add", json={"name": "Glaces"}, headers=auth)
    assert created.status_code == 201
    assert created.get_json()["category"]["restaurant_id"] == app.ids["a"]["restaurant"]


# ---------- availability & price ----------


def test_toggle_availability(client, auth, app):
    item_id = app.ids["a"]["item"]
    res = client.patch(f"/admin/items/update/{item_id}", json={"is_available": False}, headers=auth)
    assert res.get_json()["item"]["is_available"] is False


def test_price_validation(client, auth, app):
    item_id = app.ids["a"]["item"]
    for bad in (-5, "12", None, True):
        res = client.patch(f"/admin/items/update/{item_id}", json={"price": bad}, headers=auth)
        assert res.status_code == 400, bad
    ok = client.patch(f"/admin/items/update/{item_id}", json={"price": 25.5}, headers=auth)
    assert ok.get_json()["item"]["price"] == 25.5


def test_add_item_validation(client, auth, app):
    sub = app.ids["a"]["sub"]
    assert client.post("/admin/items/add", json={"price": 5, "subcategory_id": sub}, headers=auth).status_code == 400
    assert client.post("/admin/items/add", json={"name": "x", "subcategory_id": sub}, headers=auth).status_code == 400
    ok = client.post("/admin/items/add", json={"name": "Thé", "price": 12, "subcategory_id": sub}, headers=auth)
    assert ok.status_code == 201


# ---------- discounts ----------


def test_percent_discount(client, auth, app):
    item_id = app.ids["a"]["item"]
    res = client.patch(
        f"/admin/items/update/{item_id}",
        json={"discount": {"type": "percent", "value": 25}},
        headers=auth,
    )
    item = res.get_json()["item"]
    assert item["price"] == 20 and item["final_price"] == 15
    assert item["discount"]["active"] is True


def test_fixed_discount(client, auth, app):
    item_id = app.ids["a"]["item"]
    res = client.patch(
        f"/admin/items/update/{item_id}",
        json={"discount": {"type": "fixed", "value": 5}},
        headers=auth,
    )
    assert res.get_json()["item"]["final_price"] == 15


def test_discount_window(client, auth, app):
    item_id = app.ids["a"]["item"]
    future = client.patch(
        f"/admin/items/update/{item_id}",
        json={"discount": {"type": "percent", "value": 50, "starts_at": iso(2), "ends_at": iso(5)}},
        headers=auth,
    ).get_json()["item"]
    assert future["final_price"] == 20 and future["discount"]["active"] is False

    expired = client.patch(
        f"/admin/items/update/{item_id}",
        json={"discount": {"type": "percent", "value": 50, "starts_at": iso(-5), "ends_at": iso(-2)}},
        headers=auth,
    ).get_json()["item"]
    assert expired["final_price"] == 20

    running = client.patch(
        f"/admin/items/update/{item_id}",
        json={"discount": {"type": "percent", "value": 50, "starts_at": iso(-1), "ends_at": iso(1)}},
        headers=auth,
    ).get_json()["item"]
    assert running["final_price"] == 10


def test_invalid_discounts_rejected(client, auth, app):
    item_id = app.ids["a"]["item"]
    cases = [
        {"type": "percent", "value": 150},
        {"type": "percent", "value": 0},
        {"type": "fixed", "value": 999},
        {"type": "weird", "value": 5},
        {"type": "percent", "value": 10, "starts_at": iso(5), "ends_at": iso(1)},
        {"type": "percent", "value": 10, "starts_at": "not a date"},
    ]
    for discount in cases:
        res = client.patch(f"/admin/items/update/{item_id}", json={"discount": discount}, headers=auth)
        assert res.status_code == 400, discount


def test_clear_discount(client, auth, app):
    item_id = app.ids["a"]["item"]
    client.patch(f"/admin/items/update/{item_id}", json={"discount": {"type": "percent", "value": 50}}, headers=auth)
    res = client.patch(f"/admin/items/update/{item_id}", json={"discount": None}, headers=auth)
    item = res.get_json()["item"]
    assert item["discount"] is None and item["final_price"] == 20


def test_price_drop_below_fixed_discount_rejected(client, auth, app):
    item_id = app.ids["a"]["item"]
    client.patch(f"/admin/items/update/{item_id}", json={"discount": {"type": "fixed", "value": 15}}, headers=auth)
    res = client.patch(f"/admin/items/update/{item_id}", json={"price": 10}, headers=auth)
    assert res.status_code == 400


# ---------- public menu ----------


def test_public_full_menu_shows_live_prices(client, auth, app):
    item_id = app.ids["a"]["item"]
    client.patch(
        f"/admin/items/update/{item_id}",
        json={"is_available": False, "discount": {"type": "percent", "value": 50}},
        headers=auth,
    )
    res = client.get(f"/api/restaurants/{app.ids['a']['restaurant']}/menu/full")
    assert res.status_code == 200  # public: no token
    item = res.get_json()["categories"][0]["subcategories"][0]["items"][0]
    assert item["final_price"] == 10 and item["discount_active"] is True
    assert item["is_available"] is False
    assert "discount_type" not in item  # internal fields stay private


def test_public_menu_404(client):
    assert client.get("/api/restaurants/9999/menu/full").status_code == 404
