"""Tiny additive migration: add columns introduced after a database was created.

db.create_all() creates missing tables but never adds columns to existing ones,
and this project has no Alembic. Only ever *adds* nullable columns, so it is safe
to run on every startup (SQLite and PostgreSQL).
"""

from sqlalchemy import inspect, text

from .db import db

# table -> {column: SQL type}
NEW_COLUMNS = {
    "items": {
        "image_url": "VARCHAR",
        "sort_order": "INTEGER DEFAULT 0",
        "discount_type": "VARCHAR",
        "discount_value": "FLOAT",
        "discount_starts_at": "TIMESTAMP",
        "discount_ends_at": "TIMESTAMP",
    }
}


def ensure_schema():
    inspector = inspect(db.engine)
    for table, columns in NEW_COLUMNS.items():
        if not inspector.has_table(table):
            continue
        existing = {c["name"] for c in inspector.get_columns(table)}
        for name, sql_type in columns.items():
            if name not in existing:
                with db.engine.begin() as conn:
                    conn.execute(
                        text(f"ALTER TABLE {table} ADD COLUMN {name} {sql_type}")
                    )
