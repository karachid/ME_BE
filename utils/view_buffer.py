"""Batch menu-visit writes so a scan does not wait on (or hammer) the database.

Each scan appends to an in-memory list. The list is written with ONE bulk INSERT when
it reaches VIEW_BATCH_MAX rows, or VIEW_FLUSH_SECONDS after the first buffered row
(a daemon timer), or when stats are read / the process exits.

Trade-offs, on purpose: visit counts are analytics, so if a worker is killed hard
(e.g. SIGKILL) the last few seconds of its visits are lost. Every worker keeps its
own buffer, and the rows are simply summed in the database.
"""

import atexit
import logging
import threading
from datetime import datetime, timezone

from flask import current_app
from sqlalchemy import insert

from models.activity import MenuView
from models.db import db

logger = logging.getLogger("MenuXpert")

_lock = threading.Lock()
_buffer = []  # [(restaurant_id, created_at), ...]
_timer = None
_app = None  # last app that buffered a visit, used to flush at shutdown


def _now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def add(restaurant_id):
    """Record one visit (cheap: no database access unless a flush is due)."""
    global _timer, _app
    _app = current_app._get_current_object()  # noqa: SLF001
    seconds = current_app.config.get("VIEW_FLUSH_SECONDS", 10)
    batch_max = current_app.config.get("VIEW_BATCH_MAX", 100)

    with _lock:
        _buffer.append((restaurant_id, _now()))
        full = len(_buffer) >= batch_max
        first = len(_buffer) == 1

    if seconds <= 0 or full:
        flush()
    elif first:
        # The timer thread has no request, so hand it the app to open a context.
        app = _app

        def _run():
            with app.app_context():
                flush()

        _timer = threading.Timer(seconds, _run)
        _timer.daemon = True
        _timer.start()


def flush():
    """Write everything buffered with a single INSERT. Safe to call at any time."""
    with _lock:
        rows = _buffer[:]
        _buffer.clear()
    if not rows:
        return 0
    try:
        db.session.execute(
            insert(MenuView),
            [{"restaurant_id": rid, "created_at": ts} for rid, ts in rows],
        )
        db.session.commit()
    except Exception:  # analytics must never break a request
        db.session.rollback()
        logger.exception("Could not write %d menu visits", len(rows))
        return 0
    return len(rows)


def pending():
    with _lock:
        return len(_buffer)


def reset():
    """Drop buffered rows without writing them (tests)."""
    global _timer
    with _lock:
        _buffer.clear()
    if _timer is not None:
        _timer.cancel()
        _timer = None


def _flush_at_exit():
    """Write what is still buffered on a clean shutdown (gunicorn graceful stop, Ctrl+C)."""
    if _app is None or not pending():
        return
    with _app.app_context():
        flush()


atexit.register(_flush_at_exit)
