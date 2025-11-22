from utils.logger import setup_logger

logger = setup_logger()

def log_admin_action(action_type, object_type, object_id=None, details=None):
    msg = f"ADMIN ACTION — {action_type.upper()} {object_type}"
    if object_id:
        msg += f" (ID={object_id})"
    if details:
        msg += f" — Details: {details}"
    logger.info(msg)