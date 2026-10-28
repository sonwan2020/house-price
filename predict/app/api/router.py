"""Aggregate all API sub-routers under /api."""

from fastapi import APIRouter

from app.api import health
from app.api.v1 import model_info, predict

api_router = APIRouter(prefix="/api")

# Version-independent endpoints live directly under /api.
api_router.include_router(health.router)

v1_router = APIRouter(prefix="/v1")
v1_router.include_router(predict.router)
v1_router.include_router(model_info.router)

api_router.include_router(v1_router)
