"""Application entry point: create the app, register routes, startup events.

Run with ``python -m app.main`` (honors .env) or ``uvicorn app.main:app``.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.router import api_router
from app.config import settings
from app.core.logging import setup_logging
from app.core.model_loader import load_metrics, load_model
from app.services.predictor import Predictor

setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the model and metrics once at service start."""
    model = load_model(settings.model_path)
    metrics = load_metrics(settings.metrics_path)
    app.state.model = model
    app.state.metrics = metrics
    app.state.predictor = Predictor(model)
    logger.info("Service ready: model=%s metrics=%s", settings.model_path, "loaded" if metrics else "missing")
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=__doc__,
    lifespan=lifespan,
)
app.include_router(api_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=settings.host, port=settings.port)
