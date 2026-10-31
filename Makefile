# Local workflow helpers. The Dockerfiles / docker-compose.yaml are the
# source of truth for image builds; these targets wrap the same steps for
# host-side development (WSL/Linux).

# Model defaults mirror docker-compose.yaml so local and Docker demos agree.
MODEL_TYPE ?= linear_positive
DROP_FEATURES ?= lot_size

# Retrain only when train.py or a CSV in predict/data/ is newer than the
# artifact (same freshness check as the Dockerfile trainer stage).
train:
	@cd predict && if [ -f app/models/house_price_model.joblib ] && \
	    [ ! scripts/train.py -nt app/models/house_price_model.joblib ] && \
	    [ -z "$$(find data -name '*.csv' -newer app/models/house_price_model.joblib -print -quit)" ]; then \
	    echo "Model artifact up to date, skipping training"; \
	else \
	    MODEL_TYPE=$(MODEL_TYPE) DROP_FEATURES=$(DROP_FEATURES) \
	        .venv/bin/python scripts/train.py; \
	fi

# Run the predict service's pytest suite (uses predict/.venv).
test:
	cd predict && .venv/bin/python -m pytest

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

.PHONY: train test up down logs
