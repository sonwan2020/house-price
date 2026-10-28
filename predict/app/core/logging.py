"""Logging setup shared by the API and the training script."""

import logging

_LOG_FORMAT = "%(asctime)s %(levelname)s %(name)s: %(message)s"


def setup_logging(level: int = logging.INFO) -> None:
    """Configure the root logger (idempotent: first call wins)."""
    logging.basicConfig(level=level, format=_LOG_FORMAT)
