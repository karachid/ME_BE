import os

DB_URL = os.getenv("DATABASE_URL", "sqlite:///menu.db")  # fallback for local testing

# Heroku-style URLs use "postgres://", which SQLAlchemy 2 no longer accepts.
if DB_URL.startswith("postgres://"):
    DB_URL = DB_URL.replace("postgres://", "postgresql://", 1)

# Signs login tokens. MUST be set to a long random value in production.
SECRET_KEY = os.getenv("SECRET_KEY")
DEV_SECRET_KEY = "dev-only-secret-change-me"

# Menu visits are written to the database in batches (seconds between flushes).
VIEW_FLUSH_SECONDS = int(os.getenv("VIEW_FLUSH_SECONDS", "10"))

# /db/filldb wipes the database. Only enabled when explicitly requested.
ALLOW_FILLDB = os.getenv("ALLOW_FILLDB") == "1"
