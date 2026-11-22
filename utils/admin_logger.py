import json
import logging

from flask import g, has_request_context

logger = logging.getLogger("MenuXpert")


def log_admin_action(action_type, object_type, object_id=None, details=None, object_name=None):
    """Write to the log file and, for a logged-in owner, to the activity feed."""
    msg = f"ADMIN ACTION — {action_type.upper()} {object_type}"
    if object_id:
        msg += f" (ID={object_id})"
    if details:
        msg += f" — Details: {details}"
    logger.info(msg)

    owner = g.get("owner") if has_request_context() else None
    if owner is None:
        return

    # Imported here to avoid a circular import at app start-up.
    from models.activity import AuditLog
    from models.db import db

    try:
        db.session.add(
            AuditLog(
                restaurant_id=owner.restaurant_id,
                owner_email=owner.email,
                action_type=action_type,
                object_type=object_type,
                object_id=str(object_id) if object_id is not None else None,
                object_name=object_name,
                details=json.dumps(details, default=str) if details is not None else None,
            )
        )
        db.session.commit()
    except Exception:  # never let the activity feed break the actual change
        db.session.rollback()
        logger.exception("Could not write audit log")
