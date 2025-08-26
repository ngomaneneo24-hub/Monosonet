# Overdrive Service

Overdrive is the external ML platform powering the "For You" feed with TikTok-grade retrieval, ranking, and feature pipelines.

Components:

- Ingestion: Kafka consumers for interactions/exposures; sessionization; enrichment
- Feature Platform: Batch/online feature engineering; Feast-backed feature store
- Retrieval: Two-tower embeddings + ANN (FAISS/HNSW)
- Ranking: Sequence model + pointwise predictors; re-ranking with diversity/guardrails
- Experimentation: Config-driven experiments and guardrails
- Serving: High-performance C++ gRPC service loading ONNX models and ANN indices

## Quick Start

### Python Service

Install dependencies:
```bash
pip install -r requirements.txt
```

Run API server:
```bash
python -m overdrive.cli api
# or
python -c "from overdrive.app import run; run()"
```

Run Kafka consumer:
```bash
python -m overdrive.cli consumer
```

### C++ Serving

Build and run:
```bash
cd overdrive-serving
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
make -j$(nproc)
./overdrive-serving
```

## Production Setup

1. Start Redis: `redis-server`
2. Start Kafka: Ensure `feeds.interactions.v1` topic exists
3. Run Overdrive consumer: `python -m overdrive.cli consumer`
4. Run Overdrive serving: `./overdrive-serving`
5. Enable in timeline: Set `x-use-overdrive: 1` header

## Environment Variables

- `OVERDRIVE_KAFKA_BROKERS`: Kafka broker list (default: localhost:9092)
- `OVERDRIVE_REDIS_URL`: Redis connection string (default: redis://localhost:6379/0)
- `OVERDRIVE_SERVICE_PORT`: API server port (default: 8088)

This directory will evolve to include jobs (Airflow/Dagster), training code, and schemas.