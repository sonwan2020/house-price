"""Batch prediction service: per-item validation + prediction + result assembly.

Pure Python: no FastAPI/HTTP imports, so it is unit-testable without a server.
"""

from dataclasses import dataclass, field
from typing import Any

import pandas as pd
from pydantic import ValidationError

from app.core.errors import ErrorCode, reason
from app.schemas.predict import FEATURE_ORDER, HouseInfo, HousePrice


def _echo_id(item: Any) -> int | str | None:
    """Echo the input id when it has a valid type, else None."""
    if isinstance(item, (int, str)) and not isinstance(item, bool):
        return item
    return None


def _format_pydantic_errors(exc: ValidationError) -> str:
    """Turn a ValidationError into a single human-readable message."""
    parts = []
    for err in exc.errors():
        loc = ".".join(str(p) for p in err["loc"])
        parts.append(f"'{loc}': {err['msg']}")
    return "; ".join(parts)


@dataclass
class PredictionOutcome:
    """Result of one batch prediction call."""

    results: list[HousePrice] = field(default_factory=list)

    @property
    def ok_count(self) -> int:
        return sum(1 for r in self.results if r.message == "")

    @property
    def fail_count(self) -> int:
        return len(self.results) - self.ok_count


class Predictor:
    """Predicts house prices with per-item validation."""

    def __init__(self, model: Any):
        self._model = model
        # Prefer the feature order recorded on the fitted model.
        self._order = [str(n) for n in getattr(model, "feature_names_in_", FEATURE_ORDER)]

    def predict_many(self, items: list[Any]) -> PredictionOutcome:
        """Validate each item and predict prices for the valid ones.

        Results are returned in input order; failed items get ``price = 0``
        and a reason in ``message``.
        """
        infos: list[tuple[int, HouseInfo]] = []
        results: list[HousePrice | None] = [None] * len(items)

        for index, item in enumerate(items):
            info, error = self._validate_item(item, index)
            if error is not None:
                results[index] = error
            else:
                infos.append((index, info))

        if infos:
            # DataFrame (not raw lists) so feature names are checked
            # against the fitted model's order.
            x = pd.DataFrame(
                [[getattr(info, name) for name in self._order] for _, info in infos],
                columns=self._order,
            )
            predicted = self._model.predict(x)
            for (index, info), price in zip(infos, predicted):
                results[index] = HousePrice(
                    index=index,
                    id=info.id,
                    price=round(float(price), 2),
                    message="",
                )

        return PredictionOutcome(results=[r for r in results if r is not None])

    def _validate_item(
        self, item: Any, index: int
    ) -> tuple[HouseInfo | None, HousePrice | None]:
        """Validate one input item; returns (parsed info, error result)."""
        if not isinstance(item, dict):
            return None, HousePrice(
                index=index,
                id=None,
                price=0.0,
                message=reason(ErrorCode.NOT_OBJECT, "item must be a JSON object"),
            )

        problems: list[str] = []
        # Missing / wrong-type checks with friendly messages; Pydantic
        # below enforces the numeric range constraints.
        for name in FEATURE_ORDER:
            value = item.get(name)
            if value is None:
                problems.append(reason(ErrorCode.MISSING_FIELD, f"'{name}' is required"))
                continue
            if isinstance(value, bool) or not isinstance(value, (int, float)):
                problems.append(reason(ErrorCode.INVALID_TYPE, f"'{name}' must be a number"))
                continue
            if name in ("bedrooms", "year_built") and float(value) != int(value):
                problems.append(reason(ErrorCode.NOT_INTEGER, f"'{name}' must be an integer"))

        if "id" in item and item["id"] is not None and (
            isinstance(item["id"], bool) or not isinstance(item["id"], (int, str))
        ):
            problems.append(reason(ErrorCode.INVALID_ID, "'id' must be a string, integer, or null"))

        if problems:
            return None, HousePrice(
                index=index,
                id=_echo_id(item.get("id")),
                price=0.0,
                message="; ".join(problems),
            )

        try:
            info = HouseInfo.model_validate(item)
        except ValidationError as exc:
            return None, HousePrice(
                index=index,
                id=_echo_id(item.get("id")),
                price=0.0,
                message=reason(ErrorCode.OUT_OF_RANGE, _format_pydantic_errors(exc)),
            )
        return info, None
