"""HTTP contract tests for the API (TestClient, no live server needed)."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.predict import CURRENT_YEAR


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
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_is_version_independent(client):
    """The old versioned path must be gone after the move."""
    assert client.get("/api/v1/health").status_code == 404


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
    assert body["summary"] == {"total": 2, "succeed": 2, "failed": 0}
    predicts = body["predicts"]
    assert [r["index"] for r in predicts] == [0, 1]
    assert predicts[0]["id"] == ""  # omitted -> empty string
    assert predicts[1]["id"] == "house-2"
    assert all(r["price"] > 0 for r in predicts)
    assert all(isinstance(r["price"], int) for r in predicts)
    assert all(r["reason"] == "" for r in predicts)


def test_predict_price_is_rounded_to_1000(client):
    response = client.post("/api/v1/predict", json=[valid_item()])
    assert response.status_code == 200
    price = response.json()["predicts"][0]["price"]
    assert price == 251000
    assert price % 1000 == 0


def test_predict_all_failed_returns_400(client):
    payload = [{"id": "bad-1"}, valid_item(square_footage="big", year_built=None)]
    response = client.post("/api/v1/predict", json=payload)
    assert response.status_code == 400
    body = response.json()
    assert body["summary"] == {"total": 2, "succeed": 0, "failed": 2}
    predicts = body["predicts"]
    assert len(predicts) == 2
    assert all(r["price"] == 0 for r in predicts)
    assert "[MISSING_FIELD]" in predicts[0]["reason"]
    assert "[INVALID_TYPE]" in predicts[1]["reason"]


def test_predict_partial_returns_207(client):
    payload = [valid_item(), {"id": "bad-2"}]
    response = client.post("/api/v1/predict", json=payload)
    assert response.status_code == 207
    body = response.json()
    assert body["summary"] == {"total": 2, "succeed": 1, "failed": 1}
    predicts = body["predicts"]
    assert predicts[0]["price"] > 0 and predicts[0]["reason"] == ""
    assert predicts[1]["price"] == 0 and predicts[1]["reason"] != ""


def test_predict_single_item(client):
    response = client.post("/api/v1/predict", json=[valid_item()])
    assert response.status_code == 200
    body = response.json()
    assert body["summary"] == {"total": 1, "succeed": 1, "failed": 0}
    assert len(body["predicts"]) == 1


def test_predict_empty_array_returns_200(client):
    response = client.post("/api/v1/predict", json=[])
    assert response.status_code == 200
    assert response.json() == {"summary": {"total": 0, "succeed": 0, "failed": 0}, "predicts": []}


def test_predict_non_array_body_returns_422(client):
    response = client.post("/api/v1/predict", json={"not": "an array"})
    assert response.status_code == 422


def test_id_must_be_a_string(client):
    response = client.post("/api/v1/predict", json=[valid_item(id=123)])
    assert response.status_code == 400
    body = response.json()
    assert body["predicts"][0]["price"] == 0
    assert body["predicts"][0]["id"] == ""
    assert "[INVALID_ID] 'id' must be a string" in body["predicts"][0]["reason"]


def test_predict_wrong_type_is_per_item_error(client):
    response = client.post("/api/v1/predict", json=[valid_item(bedrooms="three")])
    assert response.status_code == 400
    body = response.json()
    assert body["predicts"][0]["price"] == 0
    assert "[INVALID_TYPE] 'bedrooms' must be a number" in body["predicts"][0]["reason"]


def test_predict_range_violation_is_per_item_error(client):
    response = client.post(
        "/api/v1/predict", json=[valid_item(), valid_item(year_built=3000)]
    )
    assert response.status_code == 207
    body = response.json()
    assert body["predicts"][1]["price"] == 0
    assert "[OUT_OF_RANGE]" in body["predicts"][1]["reason"]


def test_openapi_documents_house_info(client):
    """The OpenAPI spec must reference HouseInfo from components for /predict."""
    spec = client.get("/openapi.json").json()
    schema = spec["paths"]["/api/v1/predict"]["post"]["requestBody"]["content"][
        "application/json"
    ]["schema"]
    assert schema["items"] == {"$ref": "#/components/schemas/HouseInfo"}
    items = spec["components"]["schemas"]["HouseInfo"]
    assert items["type"] == "object"
    assert items["title"] == "HouseInfo"
    assert set(items["required"]) == {
        "square_footage",
        "bedrooms",
        "bathrooms",
        "year_built",
        "lot_size",
        "distance_to_city_center",
        "school_rating",
    }
    for name in items["required"]:
        field = items["properties"][name]
        assert field["description"], f"{name} schema lacks a description"
    assert items["properties"]["square_footage"]["type"] == "number"
    assert items["properties"]["bedrooms"]["type"] == "integer"
    assert items["properties"]["year_built"]["minimum"] == 1900
    assert items["properties"]["id"]["type"] == "string"


def test_year_built_upper_boundary(client):
    """CURRENT_YEAR + x is valid for x <= 5, invalid for x > 5."""
    ok = client.post(
        "/api/v1/predict",
        json=[
            valid_item(year_built=CURRENT_YEAR),
            valid_item(year_built=CURRENT_YEAR + 5),
        ],
    )
    assert ok.status_code == 200
    assert ok.json()["summary"] == {"total": 2, "succeed": 2, "failed": 0}

    bad = client.post(
        "/api/v1/predict",
        json=[valid_item(year_built=CURRENT_YEAR + 5), valid_item(year_built=CURRENT_YEAR + 6)],
    )
    assert bad.status_code == 207
    body = bad.json()
    assert body["summary"] == {"total": 2, "succeed": 1, "failed": 1}
    assert body["predicts"][0]["price"] > 0
    assert body["predicts"][1]["price"] == 0
    assert "[OUT_OF_RANGE]" in body["predicts"][1]["reason"]
