import os

DB_URL = os.getenv("DATABASE_URL", "sqlite:///menu.db")  # fallback for local testing
