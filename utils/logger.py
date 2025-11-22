import logging
import sys


def setup_logger():
    logger = logging.getLogger("MenuXpert")
    logger.setLevel(logging.INFO)

    handler = logging.StreamHandler(sys.stdout)
    formatter = logging.Formatter("%(asctime)s — [%(levelname)s] — %(message)s")
    handler.setFormatter(formatter)

    # Prevent adding multiple handlers when re-importing
    if not logger.handlers:
        logger.addHandler(handler)

    return logger
