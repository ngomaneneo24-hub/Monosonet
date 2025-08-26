set shell := ["bash", "-cu"]

# Usage: just build
build:
	cd moderation && cargo build

# Usage: just run
run:
	cd moderation && RUST_LOG=${RUST_LOG:-info} cargo run

# Usage: just docker-build
docker-build:
	docker build -f moderation/Dockerfile -t moderation:latest .

# Usage: just docker-run
# Env vars: SERVER_PORT, DATABASE_URL, REDIS_URL
docker-run:
	docker run --rm -p ${SERVER_PORT:-8080}:8080 \
		-e SERVER_PORT=${SERVER_PORT:-8080} \
		-e DATABASE_URL=${DATABASE_URL:?set DATABASE_URL} \
		-e REDIS_URL=${REDIS_URL:?set REDIS_URL} \
		-e RUST_LOG=${RUST_LOG:-info} \
		moderation:latest