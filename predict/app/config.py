"""Application configuration.

Defaults can be overridden via environment variables or a local ``.env``
file at the repository root (see ``.env.example``).
"""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

#: Repository root (one level up from app/).
BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Runtime settings for the API."""

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "House Price Prediction API"
    app_version: str = "1.0.0"
    host: str = "127.0.0.1"
    port: int = 8000

    #: Tag reported by /model-info; bump when a new model is trained.
    model_version: str = "1.0"
    model_path: Path = BASE_DIR / "app" / "models" / "house_price_model.joblib"
    metrics_path: Path = BASE_DIR / "app" / "models" / "model_metrics.json"


settings = Settings()
