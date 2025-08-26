# Overdrive Service

Overdrive is the external ML platform powering the "For You" feed with TikTok-grade retrieval, ranking, and feature pipelines.

Components:

- Ingestion: Kafka consumers for interactions/exposures; sessionization; enrichment
- Feature Platform: Batch/online feature engineering; Feast-backed feature store
- Retrieval: Two-tower embeddings + ANN (FAISS/HNSW)
- Ranking: Sequence model + pointwise predictors; re-ranking with diversity/guardrails
- Experimentation: Config-driven experiments and guardrails
- Serving: High-performance C++ gRPC service loading ONNX models and ANN indices

Dev quickstart:

- Python API: FastAPI app for health/metrics/admin
- Requirements in `requirements.txt`
- C++ serving in `../overdrive-serving`

This directory will evolve to include jobs (Airflow/Dagster), training code, and schemas.