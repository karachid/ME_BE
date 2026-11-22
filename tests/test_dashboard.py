from routes import menu_routes as menu_module


def patch(client, auth, item_id, body):
    return client.patch(f"/admin/items/update/{item_id}", json=body, headers=auth)


# ---------- stats ----------


def test_stats_requires_auth(client):
    assert client.get("/admin/stats").status_code == 401
    assert client.get("/admin/activity").status_code == 401


def test_stats_counts(client, auth, app):
    item_id = app.ids["a"]["item"]
    patch(client, auth, item_id, {"is_available": False, "discount": {"type": "percent", "value": 10}})
    stats = client.get("/admin/stats?days=7", headers=auth).get_json()

    assert stats["items"]["total"] == 1
    assert stats["items"]["sold_out"] == 1 and stats["items"]["available"] == 0
    assert stats["promotions"]["active"] == 1
    assert stats["health"]["missing_image"] == 1
    assert stats["health"]["quality_score"] == 0
    assert len(stats["views"]["series"]) == 7
    assert stats["views"]["total"] == 0
    assert stats["views"]["change_percent"] is None  # no baseline yet


def test_stats_is_scoped_to_owner(client, auth, app):
    # Owner B's item must not appear in A's numbers.
    assert client.get("/admin/stats", headers=auth).get_json()["items"]["total"] == 1


# ---------- view tracking ----------


def test_views_counted_once_per_visitor(client, auth, app):
    menu_module._recent_views.clear()
    rid = app.ids["a"]["restaurant"]
    first = client.post(f"/api/restaurants/{rid}/view").get_json()
    second = client.post(f"/api/restaurants/{rid}/view").get_json()
    assert first["counted"] is True and second["counted"] is False

    stats = client.get("/admin/stats?days=7", headers=auth).get_json()
    assert stats["views"]["today"] == 1 and stats["views"]["total"] == 1
    assert client.post("/api/restaurants/9999/view").status_code == 404


# ---------- activity feed ----------


def test_activity_feed_records_changes(client, auth, app):
    item_id = app.ids["a"]["item"]
    patch(client, auth, item_id, {"price": 30})
    feed = client.get("/admin/activity", headers=auth).get_json()
    assert feed[0]["action_type"] == "update"
    assert feed[0]["object_name"] == "Espresso"
    assert feed[0]["owner_email"] == "a@test.ma"
    assert feed[0]["details"]["new_price"] == 30


def test_activity_feed_is_scoped(client, auth, app):
    other = app.ids["b"]["item"]
    patch(client, auth, other, {"price": 1})  # rejected (404), must not be logged
    assert client.get("/admin/activity", headers=auth).get_json() == []


# ---------- bulk ----------


def test_bulk_availability_and_price(client, auth, app):
    sub = app.ids["a"]["sub"]
    new = client.post("/admin/items/add", json={"name": "Thé", "price": 10, "subcategory_id": sub}, headers=auth)
    ids = [app.ids["a"]["item"], new.get_json()["item"]["id"]]

    res = client.post("/admin/items/bulk", json={"ids": ids, "action": "availability", "is_available": False}, headers=auth)
    assert res.status_code == 200 and all(not i["is_available"] for i in res.get_json()["items"])

    res = client.post("/admin/items/bulk", json={"ids": ids, "action": "price", "mode": "percent", "value": 10}, headers=auth)
    prices = sorted(i["price"] for i in res.get_json()["items"])
    assert prices == [11.0, 22.0]


def test_bulk_discount_all_or_nothing(client, auth, app):
    sub = app.ids["a"]["sub"]
    cheap = client.post("/admin/items/add", json={"name": "Eau", "price": 5, "subcategory_id": sub}, headers=auth).get_json()["item"]["id"]
    ids = [app.ids["a"]["item"], cheap]
    # fixed 10 off is fine for the 20 MAD item but invalid for the 5 MAD one -> nothing changes
    res = client.post("/admin/items/bulk", json={"ids": ids, "action": "discount", "discount": {"type": "fixed", "value": 10}}, headers=auth)
    assert res.status_code == 400
    items = client.get("/admin/items/allitems", headers=auth).get_json()
    assert all(i["discount"] is None for i in items)


def test_bulk_rejects_other_restaurants_items_and_bad_input(client, auth, app):
    other = app.ids["b"]["item"]
    res = client.post("/admin/items/bulk", json={"ids": [other], "action": "availability", "is_available": False}, headers=auth)
    assert res.status_code == 404
    assert client.post("/admin/items/bulk", json={"ids": [], "action": "price"}, headers=auth).status_code == 400
    assert client.post("/admin/items/bulk", json={"ids": [app.ids["a"]["item"]], "action": "nope"}, headers=auth).status_code == 400
    assert client.post("/admin/items/bulk", json={"ids": [app.ids["a"]["item"]], "action": "price", "mode": "fixed", "value": -999}, headers=auth).status_code == 400


# ---------- categories ----------


def test_category_list_has_item_counts(client, auth, app):
    cats = client.get(f"/admin/categories/allcategories/{app.ids['a']['restaurant']}", headers=auth).get_json()
    assert cats[0]["item_count"] == 1 and cats[0]["subcategories"][0]["item_count"] == 1


def test_cannot_delete_category_with_items(client, auth, app):
    cat = client.get(f"/admin/categories/allcategories/{app.ids['a']['restaurant']}", headers=auth).get_json()[0]
    res = client.delete(f"/admin/categories/delete/{cat['id']}", headers=auth)
    assert res.status_code == 409 and res.get_json()["code"] == "category_not_empty"
    # empty ones can be deleted
    empty = client.post("/admin/categories/add", json={"name": "Vide"}, headers=auth).get_json()["category"]
    assert client.delete(f"/admin/categories/delete/{empty['id']}", headers=auth).status_code == 200


def test_cannot_delete_subcategory_with_items(client, auth, app):
    cat = client.get(f"/admin/categories/allcategories/{app.ids['a']['restaurant']}", headers=auth).get_json()[0]
    res = client.patch(f"/admin/categories/update/{cat['id']}", json={"delete_subcategories": [app.ids["a"]["sub"]]}, headers=auth)
    assert res.status_code == 409


def test_renaming_category_renames_its_default_subcategory(client, auth, app):
    created = client.post("/admin/categories/add", json={"name": "Glaces", "subcategories": ["Glaces"]}, headers=auth).get_json()["category"]
    res = client.patch(f"/admin/categories/update/{created['id']}", json={"name": "Desserts"}, headers=auth)
    cat = res.get_json()["category"]
    assert cat["name"] == "Desserts" and cat["subcategories"][0]["name"] == "Desserts"


# ---------- settings ----------


def test_rename_restaurant(client, auth):
    res = client.patch("/admin/restaurant", json={"name": "  Café Atlas "}, headers=auth)
    assert res.get_json()["owner"]["restaurant"]["name"] == "Café Atlas"
    assert client.patch("/admin/restaurant", json={"name": "  "}, headers=auth).status_code == 400


def test_change_password(client, auth):
    bad = client.post("/auth/change-password", json={"current_password": "wrong", "new_password": "newpassword1"}, headers=auth)
    assert bad.status_code == 400
    short = client.post("/auth/change-password", json={"current_password": "password123", "new_password": "short"}, headers=auth)
    assert short.status_code == 400
    ok = client.post("/auth/change-password", json={"current_password": "password123", "new_password": "newpassword1"}, headers=auth)
    assert ok.status_code == 200
    assert client.post("/auth/login", json={"email": "a@test.ma", "password": "password123"}).status_code == 401
    assert client.post("/auth/login", json={"email": "a@test.ma", "password": "newpassword1"}).status_code == 200
