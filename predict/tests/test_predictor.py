"""Unit tests for the prediction service (no HTTP server needed)."""

import joblib
import pytest

from app.config import settings
from app.schemas.predict import CURRENT_YEAR
from app.services.predictor import Predictor


@pytest.fixture(scope="module")
def predictor():
    model = joblib.load(settings.model_path)
    return Predictor(model)


def valid_item(**overrides) -> dict:
    """A fully valid house, with any fields overridden."""
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


def test_all_valid_items_are_predicted(predictor):
    outcome = predictor.predict_many([valid_item(), valid_item(id="house-1")])
    assert outcome.ok_count == 2
    assert outcome.fail_count == 0
    assert [r.index for r in outcome.results] == [0, 1]
    assert all(r.price > 0 for r in outcome.results)
    assert all(r.message == "" for r in outcome.results)
    assert outcome.results[0].id == ""  # omitted -> empty string
    assert outcome.results[1].id == "house-1"


def test_price_matches_training_run(predictor):
    # First row of Test Data For Prediction.csv in scripts/train.py output:
    # 250879.73 rounded to the nearest 1000.
    outcome = predictor.predict_many([valid_item()])
    assert outcome.results[0].price == 251000
    assert isinstance(outcome.results[0].price, int)


def test_missing_fields_fail_with_code(predictor):
    outcome = predictor.predict_many([{"id": "x"}])
    assert outcome.ok_count == 0
    assert outcome.fail_count == 1
    result = outcome.results[0]
    assert result.price == 0.0
    assert "[MISSING_FIELD]" in result.message
    for name in ("square_footage", "bedrooms", "year_built"):
        assert f"'{name}' is required" in result.message


def test_wrong_type_fails_with_code(predictor):
    outcome = predictor.predict_many([valid_item(square_footage="big")])
    result = outcome.results[0]
    assert result.price == 0.0
    assert "[INVALID_TYPE]" in result.message
    assert "'square_footage' must be a number" in result.message


def test_non_integer_bedrooms_fails(predictor):
    outcome = predictor.predict_many([valid_item(bedrooms=2.5)])
    assert "[NOT_INTEGER]" in outcome.results[0].message


def test_null_field_is_missing(predictor):
    outcome = predictor.predict_many([valid_item(year_built=None)])
    assert "[MISSING_FIELD]" in outcome.results[0].message


def test_range_violation_fails_with_code(predictor):
    outcome = predictor.predict_many([valid_item(square_footage=-500)])
    assert outcome.fail_count == 1
    assert "[OUT_OF_RANGE]" in outcome.results[0].message


def test_year_built_upper_boundary(predictor):
    """CURRENT_YEAR + x is valid for x <= 5, invalid for x > 5."""
    ok = predictor.predict_many(
        [
            valid_item(year_built=CURRENT_YEAR),
            valid_item(year_built=CURRENT_YEAR + 1),
            valid_item(year_built=CURRENT_YEAR + 5),
        ]
    )
    assert ok.ok_count == 3
    assert ok.fail_count == 0

    bad = predictor.predict_many(
        [
            valid_item(year_built=CURRENT_YEAR + 6),
            valid_item(year_built=CURRENT_YEAR + 100),
        ]
    )
    assert bad.ok_count == 0
    assert bad.fail_count == 2
    assert all("[OUT_OF_RANGE]" in r.message for r in bad.results)


def test_year_built_lower_boundary(predictor):
    ok = predictor.predict_many([valid_item(year_built=1900)])
    assert ok.ok_count == 1

    bad = predictor.predict_many([valid_item(year_built=1899)])
    assert bad.fail_count == 1
    assert "[OUT_OF_RANGE]" in bad.results[0].message


def test_invalid_id_fails_with_code(predictor):
    outcome = predictor.predict_many(
        [valid_item(id=123), valid_item(id=True), valid_item(id=None)]
    )
    assert all(r.price == 0 for r in outcome.results)
    assert all("[INVALID_ID] 'id' must be a string" in r.message for r in outcome.results)


def test_non_dict_item_fails(predictor):
    outcome = predictor.predict_many(["not an object"])
    result = outcome.results[0]
    assert result.price == 0.0
    assert "[NOT_OBJECT]" in result.message


def test_partial_batch(predictor):
    outcome = predictor.predict_many([valid_item(), {"id": "bad"}, valid_item(id="ok")])
    assert outcome.ok_count == 2
    assert outcome.fail_count == 1
    assert outcome.results[0].price > 0
    assert outcome.results[1].price == 0.0
    assert outcome.results[2].id == "ok"
    assert [r.index for r in outcome.results] == [0, 1, 2]


def test_empty_batch(predictor):
    outcome = predictor.predict_many([])
    assert outcome.results == []
    assert outcome.ok_count == 0
    assert outcome.fail_count == 0
