"""Application entry point: create the app, register routes, startup events.

Run with ``python -m app.main`` (honors .env) or ``uvicorn app.main:app``.
"""

import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

from app.api.router import api_router
from app.config import settings
from app.core.logging import setup_logging
from app.core.model_loader import load_metrics, load_model
from app.schemas.predict import HouseInfo
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


def custom_openapi() -> dict[str, Any]:
    """Generate the OpenAPI schema, registering HouseInfo in components.

    POST /predict deliberately keeps its body typed as ``list[Any]``: items
    are validated individually so invalid entries produce 200/207/400 with
    per-item reasons instead of a blanket 422. Because HouseInfo never
    appears in a route annotation, FastAPI would not put it in
    ``components.schemas`` — but the endpoint's request body references
    ``#/components/schemas/HouseInfo``, so register it here.
    """
    routes_version = app.router._get_routes_version()
    if not app.openapi_schema or app._openapi_routes_version != routes_version:
        schema = get_openapi(
            title=app.title,
            version=app.version,
            openapi_version=app.openapi_version,
            summary=app.summary,
            description=app.description,
            terms_of_service=app.terms_of_service,
            contact=app.contact,
            license_info=app.license_info,
            routes=app.routes,
            webhooks=app.webhooks.routes,
            tags=app.openapi_tags,
            servers=app.servers,
            separate_input_output_schemas=app.separate_input_output_schemas,
            external_docs=app.openapi_external_docs,
        )
        schema["components"]["schemas"]["HouseInfo"] = HouseInfo.model_json_schema()
        app.openapi_schema = schema
        app._openapi_routes_version = routes_version
    return app.openapi_schema


app.openapi = custom_openapi


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=settings.host, port=settings.port)
