"""Pydantic request/response schemas for the predict endpoints."""

from datetime import datetime

from pydantic import BaseModel, Field, RootModel

CURRENT_YEAR = datetime.now().year

#: Required features, in model input order (matches scripts/train.py).
FEATURE_ORDER = [
    "square_footage",
    "bedrooms",
    "bathrooms",
    "year_built",
    "lot_size",
    "distance_to_city_center",
    "school_rating",
]


class HouseFeatures(BaseModel):
    """The seven numeric housing features the model was trained on.

    All fields are required and must satisfy the sanity ranges below.
    """

    square_footage: float = Field(
        description="Total square footage of the house (must be > 0).",
        gt=0,
        le=100_000,
    )
    bedrooms: float = Field(
        description="Number of bedrooms (integer, 1 to 20).",
        ge=1,
        le=20,
    )
    bathrooms: float = Field(
        description="Number of bathrooms (0.5 to 20, half baths allowed).",
        gt=0,
        le=20,
    )
    year_built: float = Field(
        description=f"Year the house was built (integer, 1800 to {CURRENT_YEAR + 5}).",
        ge=1800,
        le=CURRENT_YEAR + 5,
    )
    lot_size: float = Field(
        description="Lot size in square feet (must be > 0).",
        gt=0,
        le=1_000_000,
    )
    distance_to_city_center: float = Field(
        description="Distance to the city center in miles (>= 0).",
        ge=0,
        le=1_000,
    )
    school_rating: float = Field(
        description="School rating (0 to 10).",
        ge=0,
        le=10,
    )


class HouseInfo(HouseFeatures):
    """One house to predict: all features required, plus an optional id."""

    id: int | str | None = Field(
        default=None,
        description="Optional client-supplied identifier, echoed back in the response.",
    )


class HousePrice(BaseModel):
    """One prediction result, always returned in the same order as the input."""

    index: int = Field(
        description="Position of the input item in the request array, starting at 0."
    )
    id: int | str | None = Field(
        default=None, description="Echo of the optional input id."
    )
    price: float = Field(
        description="Predicted price, or 0 when the item could not be predicted."
    )
    message: str = Field(
        default="",
        description="Empty on success; on failure the reason why price is 0.",
    )


class PredictRequest(RootModel[list[HouseInfo]]):
    """Request body of POST /predict: a JSON array of HouseInfo objects.

    Note: the endpoint validates items individually so a partially invalid
    batch still returns predictions for the valid items (HTTP 207).
    """


class PredictResponse(RootModel[list[HousePrice]]):
    """Response body of POST /predict: a JSON array of HousePrice objects."""
