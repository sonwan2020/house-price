# syntax=docker/dockerfile:1

FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install dependencies first so they are cached across rebuilds.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt


# ---- trainer: produces the model artifacts ----
FROM base AS trainer

# Regression model trained by this stage: linear | linear_positive | ridge | lasso.
ARG MODEL_TYPE=ridge
ENV MODEL_TYPE=${MODEL_TYPE}
# Comma-separated features to exclude from training (e.g. collinear columns).
ARG DROP_FEATURES=""
ENV DROP_FEATURES=${DROP_FEATURES}

COPY app ./app
COPY data ./data
COPY scripts ./scripts

# Makefile-style freshness check: train when the model artifact is missing
# (fresh clone, since app/models/ is gitignored) or older than train.py
# or any CSV in data/.
RUN if [ ! -f app/models/house_price_model.joblib ] || \
       [ scripts/train.py -nt app/models/house_price_model.joblib ] || \
       [ -n "$(find data -name '*.csv' -newer app/models/house_price_model.joblib -print -quit)" ]; then \
        echo "Model artifact missing or stale, training from data/ ..."; \
        python scripts/train.py; \
    else \
        echo "Model artifact up to date, skipping training"; \
    fi


# ---- runtime: the API + trained artifacts ----
FROM base AS runtime

COPY app ./app
# data/ and scripts/ stay in the image so the model can be retrained on
# demand with:
#   docker compose run --rm --user root \
#     -v ./predict/app/models:/app/app/models \
#     api python scripts/train.py
COPY data ./data
COPY scripts ./scripts
COPY --from=trainer /app/app/models ./app/models

# Run as a non-root user.
RUN useradd --create-home appuser
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health')"]

# Bind 0.0.0.0 so the port mapping from the host works.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
