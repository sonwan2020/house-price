"""POST /api/v1/predict — batch house price prediction."""

from typing import Any

from fastapi import APIRouter, Body, Request
from fastapi.responses import JSONResponse

from app.schemas.predict import PredictResponse

router = APIRouter(tags=["prediction"])


@router.post(
    "/predict",
    summary="Predict house prices for an array of houses",
    response_model=PredictResponse,
    responses={
        200: {"description": "All items predicted successfully."},
        207: {"description": "Some items failed validation; price is 0 for those."},
        400: {"description": "All items failed validation; price is 0 for all."},
        422: {"description": "Request body is not a JSON array of house objects."},
    },
)
def predict(
    request: Request,
    payload: list[Any] = Body(
        description="JSON array of HouseInfo objects. Invalid items get price 0 and a reason in message.",
    ),
) -> JSONResponse:
    """Predict prices for an array of houses.

    Always returns a JSON array of HousePrice with one entry per input
    item, in input order. Status: 200 all ok, 207 partial failure,
    400 all failed.
    """
    outcome = request.app.state.predictor.predict_many(payload)

    if outcome.fail_count == 0:
        status = 200
    elif outcome.ok_count == 0:
        status = 400
    else:
        status = 207

    return JSONResponse(
        status_code=status,
        content=[r.model_dump() for r in outcome.results],
    )
