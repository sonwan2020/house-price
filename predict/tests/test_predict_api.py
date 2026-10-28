"""HTTP contract tests for the API (TestClient, no live server needed)."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:  # context manager runs the lifespan (model load)
        yield c


def valid_item(**overrides) -> dict:
    item = {
        "square_footage": 1550,
        "bedrooms": 3,
        "bathrooms": 2,
        "year_built": 1997,
        "lot_size": 6800,
        "distance_to_city_center": 4.1,
        "school_rating": 7.6,
    }
    item.update(overrides)
    return item


def test_health(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_model_info(client):
    response = client.get("/api/v1/model-info")
    assert response.status_code == 200
    body = response.json()
    assert body["model"] == "LinearRegression"
    assert body["target"] == "price"
    assert isinstance(body["coefficients"]["intercept"], float)
    assert len(body["coefficients"]["features"]) == 7
    assert body["metrics"] is not None
    assert set(body["metrics"]["cv"]) == {"r2", "rmse", "mae", "r2_train"}


def test_predict_all_ok_returns_200(client):
    payload = [valid_item(), valid_item(id="house-2", square_footage=2200)]
    response = client.post("/api/v1/predict", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert [r["index"] for r in body] == [0, 1]
    assert body[0]["id"] is None
    assert body[1]["id"] == "house-2"
    assert all(r["price"] > 0 for r in body)
    assert all(r["message"] == "" for r in body)


def test_predict_all_failed_returns_400(client):
    payload = [{"id": 1}, valid_item(square_footage="big", year_built=None)]
    response = client.post("/api/v1/predict", json=payload)
    assert response.status_code == 400
    body = response.json()
    assert len(body) == 2
    assert all(r["price"] == 0 for r in body)
    assert "[MISSING_FIELD]" in body[0]["message"]
    assert "[INVALID_TYPE]" in body[1]["message"]


def test_predict_partial_returns_207(client):
    payload = [valid_item(), {"id": 2}]
    response = client.post("/api/v1/predict", json=payload)
    assert response.status_code == 207
    body = response.json()
    assert body[0]["price"] > 0 and body[0]["message"] == ""
    assert body[1]["price"] == 0 and body[1]["message"] != ""


def test_predict_single_item(client):
    response = client.post("/api/v1/predict", json=[valid_item()])
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_predict_empty_array_returns_200(client):
    response = client.post("/api/v1/predict", json=[])
    assert response.status_code == 200
    assert response.json() == []


def test_predict_non_array_body_returns_422(client):
    response = client.post("/api/v1/predict", json={"not": "an array"})
    assert response.status_code == 422


def test_predict_wrong_type_is_per_item_error(client):
    response = client.post("/api/v1/predict", json=[valid_item(bedrooms="three")])
    assert response.status_code == 400
    body = response.json()
    assert body[0]["price"] == 0
    assert "[INVALID_TYPE] 'bedrooms' must be a number" in body[0]["message"]


def test_predict_range_violation_is_per_item_error(client):
    response = client.post(
        "/api/v1/predict", json=[valid_item(), valid_item(year_built=3000)]
    )
    assert response.status_code == 207
    body = response.json()
    assert body[1]["price"] == 0
    assert "[OUT_OF_RANGE]" in body[1]["message"]
