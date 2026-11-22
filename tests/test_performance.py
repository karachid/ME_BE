from sqlalchemy import event

from models import Category, Item, Subcategory
from models.activity import MenuView
from models.db import db
from routes import menu_routes as menu_module
from utils import view_buffer


def _grow_menu(app, categories=6, subs=3, items=4):
    """A realistic menu so a per-row query pattern would show up as many queries."""
    rid = app.ids["a"]["restaurant"]
    for c in range(categories):
        cat = Category(name=f"Cat {c}", restaurant_id=rid)
        db.session.add(cat)
        db.session.flush()
        for s in range(subs):
            sub = Subcategory(name=f"Sub {c}-{s}", category_id=cat.id)
            db.session.add(sub)
            db.session.flush()
            for i in range(items):
                db.session.add(Item(name=f"Item {c}-{s}-{i}", price=10 + i, subcategory_id=sub.id))
    db.session.commit()
    return rid


def _count_queries(fn):
    statements = []

    def record(conn, cursor, statement, parameters, context, executemany):
        statements.append(statement)

    event.listen(db.engine, "before_cursor_execute", record)
    try:
        fn()
    finally:
        event.remove(db.engine, "before_cursor_execute", record)
    return len(statements)


# ---------- step 1: no N+1 ----------


def test_public_menu_uses_a_constant_number_of_queries(client, app):
    rid = _grow_menu(app)  # ~80 items across ~20 subcategories
    queries = _count_queries(lambda: client.get(f"/api/restaurants/{rid}/menu/full"))
    assert queries <= 5, f"expected a constant number of queries, got {queries}"


def test_admin_item_list_uses_a_constant_number_of_queries(client, auth, app):
    _grow_menu(app)
    queries = _count_queries(lambda: client.get("/admin/items/allitems", headers=auth))
    assert queries <= 6, f"expected a constant number of queries, got {queries}"


def test_public_menu_content_unchanged_by_optimization(client, app):
    rid = _grow_menu(app, categories=2, subs=2, items=2)
    data = client.get(f"/api/restaurants/{rid}/menu/full").get_json()
    names = [i["name"] for c in data["categories"] for s in c["subcategories"] for i in s["items"]]
    assert "Espresso" in names and "Item 1-1-1" in names
    assert len(names) == 1 + 2 * 2 * 2


# ---------- step 2: caching ----------


def test_public_menu_is_cacheable_with_etag(client, app):
    rid = app.ids["a"]["restaurant"]
    res = client.get(f"/api/restaurants/{rid}/menu/full")
    cache = res.headers["Cache-Control"]
    assert "public" in cache and "max-age=30" in cache
    assert res.headers.get("ETag")


def test_etag_revalidation_returns_304_without_body(client, app):
    rid = app.ids["a"]["restaurant"]
    url = f"/api/restaurants/{rid}/menu/full"
    etag = client.get(url).headers["ETag"]
    again = client.get(url, headers={"If-None-Match": etag})
    assert again.status_code == 304 and again.data == b""


def test_etag_changes_when_the_menu_changes(client, auth, app):
    rid = app.ids["a"]["restaurant"]
    url = f"/api/restaurants/{rid}/menu/full"
    before = client.get(url).headers["ETag"]
    client.patch(f"/admin/items/update/{app.ids['a']['item']}", json={"price": 99}, headers=auth)
    after_resp = client.get(url, headers={"If-None-Match": before})
    assert after_resp.status_code == 200  # not a 304: customers get the new price
    assert after_resp.headers["ETag"] != before


def test_owner_preview_is_never_cached(client, app):
    rid = app.ids["a"]["restaurant"]
    res = client.get(f"/api/restaurants/{rid}/menu/full?preview=1")
    assert res.headers["Cache-Control"] == "no-store"


# ---------- step 3: batched visit writes ----------


def test_visits_are_buffered_then_written_in_one_batch(client, app):
    menu_module._recent_views.clear()
    app.config["VIEW_FLUSH_SECONDS"] = 3600  # timer will not fire during the test
    app.config["VIEW_BATCH_MAX"] = 100
    rid = app.ids["a"]["restaurant"]

    for ip in ("10.0.0.1", "10.0.0.2", "10.0.0.3"):
        res = client.post(f"/api/restaurants/{rid}/view", environ_overrides={"REMOTE_ADDR": ip})
        assert res.get_json()["counted"] is True

    assert view_buffer.pending() == 3
    assert MenuView.query.count() == 0  # the scans did not touch the database

    assert view_buffer.flush() == 3
    assert MenuView.query.count() == 3 and view_buffer.pending() == 0
    view_buffer.reset()


def test_buffer_flushes_itself_when_full(client, app):
    menu_module._recent_views.clear()
    app.config["VIEW_FLUSH_SECONDS"] = 3600
    app.config["VIEW_BATCH_MAX"] = 3
    rid = app.ids["a"]["restaurant"]

    for n in range(3):
        client.post(f"/api/restaurants/{rid}/view", environ_overrides={"REMOTE_ADDR": f"10.0.1.{n}"})

    assert MenuView.query.count() == 3
    view_buffer.reset()


def test_stats_include_visits_still_in_the_buffer(client, auth, app):
    menu_module._recent_views.clear()
    app.config["VIEW_FLUSH_SECONDS"] = 3600
    rid = app.ids["a"]["restaurant"]
    client.post(f"/api/restaurants/{rid}/view", environ_overrides={"REMOTE_ADDR": "10.0.2.1"})
    stats = client.get("/admin/stats?days=7", headers=auth).get_json()
    assert stats["views"]["today"] == 1
    view_buffer.reset()


def test_query_counter_really_detects_per_row_queries(client, app):
    """Sanity check on the test itself: the legacy tree route still lazy-loads per
    category, so the same counter must see many more queries there."""
    rid = _grow_menu(app)
    queries = _count_queries(lambda: client.get(f"/api/restaurants/{rid}/menu"))
    assert queries > 6
