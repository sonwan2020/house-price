"""Batch prediction service: per-item validation + prediction + result assembly.

Pure Python: no FastAPI/HTTP imports, so it is unit-testable without a server.
"""

from dataclasses import dataclass, field
from typing import Any

import pandas as pd
from pydantic import ValidationError

from app.core.errors import ErrorCode, reason
from app.schemas.predict import FEATURE_ORDER, HouseInfo, HousePrice


def _echo_id(item: Any) -> str:
    """Echo the input id when it is a string, else an empty string."""
    return item if isinstance(item, str) else ""


def _format_pydantic_errors(exc: ValidationError) -> str:
    """Turn a ValidationError into a single human-readable reason."""
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
    def total(self) -> int:
        return len(self.results)

    @property
    def ok_count(self) -> int:
        return sum(1 for r in self.results if r.reason == "")

    @property
    def fail_count(self) -> int:
        return self.total - self.ok_count


class Predictor:
    """Predicts house prices with per-item validation."""

    def __init__(self, model: Any):
        self._model = model
        # Prefer the feature order recorded on the fitted model.
        self._order = [str(n) for n in getattr(model, "feature_names_in_", FEATURE_ORDER)]

    def predict_many(self, items: list[Any]) -> PredictionOutcome:
        """Validate each item and predict prices for the valid ones.

        Results are returned in input order; failed items get ``price = 0``
        and a reason in ``reason``.
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
                    price=round(float(price) / 1000) * 1000,  # nearest 1000, int
                    reason="",
                )

        return PredictionOutcome(results=[r for r in results if r is not None])

    def _validate_item(
        self, item: Any, index: int
    ) -> tuple[HouseInfo | None, HousePrice | None]:
        """Validate one input item; returns (parsed info, error result)."""
        if not isinstance(item, dict):
            return None, HousePrice(
                index=index,
                id="",
                price=0,
                reason=reason(ErrorCode.NOT_OBJECT, "item must be a JSON object"),
            )

        problems: list[str] = []
        # Missing / wrong-type checks with friendly reasons; Pydantic
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

        if "id" in item and not isinstance(item["id"], str):
            problems.append(reason(ErrorCode.INVALID_ID, "'id' must be a string"))

        if problems:
            return None, HousePrice(
                index=index,
                id=_echo_id(item.get("id")),
                price=0,
                reason="; ".join(problems),
            )

        try:
            info = HouseInfo.model_validate(item)
        except ValidationError as exc:
            return None, HousePrice(
                index=index,
                id=_echo_id(item.get("id")),
                price=0,
                reason=reason(ErrorCode.OUT_OF_RANGE, _format_pydantic_errors(exc)),
            )
        return info, None
