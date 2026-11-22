# MenuXpert

Digital menu for restaurants and cafés. Owners log in to a dashboard to mark items
sold out, change prices and run discounts. Customers scan a QR code and always see
the live menu.

- `app.py`, `routes/`, `models/` — Flask API
- `frontend/` — React + TypeScript + Tailwind (owner dashboard + public menu), Arabic (RTL) / French

## Run locally

```bash
# Backend
python -m venv mxp
source mxp/bin/activate          # Windows: mxp\Scripts\activate
pip install -r requirements.txt
python app.py                    # http://localhost:5000 (SQLite menu.db)

# Create an owner login (new restaurant, or attach to an existing one)
flask --app app create-owner owner@example.com a-long-password --restaurant-name "My Café"
# or: ... --restaurant-id 1

# Frontend (second terminal)
cd frontend
npm install
npm run dev                      # http://localhost:5173 (proxies API calls to :5000)
```

Customer menu: `http://localhost:5173/m/<restaurant_id>` (the QR page in the dashboard prints it).

## Configuration (environment variables)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Database URL. Defaults to local SQLite; use PostgreSQL in production. |
| `SECRET_KEY` | **Required in production.** Signs login tokens. Use a long random value. |
| `ALLOW_FILLDB=1` | Enables `POST /db/filldb`, which **wipes the database** and loads sample data. Dev only. |
| `VITE_API_URL` | Frontend build only: backend URL when it is not served from the same origin. |

| `VIEW_FLUSH_SECONDS` | Menu visits are buffered and written in one batch at most this many seconds later (default 10). `0` writes immediately. |

New columns are added to existing databases automatically on startup (`models/schema.py`).

## Performance notes

- The public menu (`GET /api/restaurants/<id>/menu/full`) loads the whole tree in 4 queries and
  is sent with `Cache-Control: public, max-age=30, stale-while-revalidate=60` and an `ETag`
  (revalidation returns `304`). Put a CDN in front of it: customers then rarely reach the
  server. An owner's change reaches customers within about 30 seconds; the owner's own
  preview (`?preview=1`) is never cached.
- Visit counts are buffered in memory per worker and flushed in batches, so a scan never
  waits on a database write. If a worker is killed hard (SIGKILL), its last few seconds of
  visits are lost; a normal shutdown flushes them.
- The customer page loads only its own code and a self-hosted font (no third-party requests).

## Tests

```bash
pip install pytest
pytest tests
cd frontend && npm run build     # type-check + production build
```

## API

- `POST /auth/login`, `GET /auth/me`, `POST /auth/change-password`
- Owner (Bearer token, always scoped to the owner's own restaurant):
  - `/admin/items/*` (add, update, delete, `bulk` for many items at once)
  - `/admin/categories/*` (a category that still holds items cannot be deleted)
  - `GET /admin/stats?days=7|14|30|90` (KPIs, visits per day, menu-quality checks)
  - `GET /admin/activity` (who changed what), `PATCH /admin/restaurant`
- Public: `GET /api/restaurants/<id>/menu/full`, `POST /api/restaurants/<id>/view` (counts a visit, once per visitor per 30 min)

## Admin app screens

Overview (visits chart, menu health, activity), Menu (inline price/availability, bulk
actions), Categories, Promotions, QR & share, Settings. Arabic (RTL) and French.

To let phones on your Wi-Fi open the menu in development, open the admin from your PC's
network address (e.g. `http://192.168.1.20:5173`) rather than `localhost`, and allow port
5173 in the Windows firewall for private networks.
