"""Aggregate all versioned API sub-routers under /api."""

from fastapi import APIRouter

from app.api.v1 import health, model_info, predict

api_router = APIRouter(prefix="/api")

v1_router = APIRouter(prefix="/v1")
v1_router.include_router(predict.router)
v1_router.include_router(model_info.router)
v1_router.include_router(health.router)

api_router.include_router(v1_router)
