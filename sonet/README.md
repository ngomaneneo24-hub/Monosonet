# Sonet - High-Performance Social Media Platform

A Twitter-like social media platform built in C++ with microservices architecture.

## Architecture

- **User Service**: User management, authentication, profiles
- **Note Service**: Content creation and management (tweets)
- **Timeline Service**: Timeline generation and curation  
- **Fanout Service**: Content distribution to followers
- **Follow Service**: Social graph and relationships
- **Media Service**: Image and video handling
- **Search Service**: Full-text search capabilities
- **Notification Service**: Real-time notifications
- **Analytics Service**: Metrics and analytics
- **API Gateway**: Request routing and rate limiting

## Tech Stack

- **Language**: C++17/20
- **Databases**: PostgreSQL, Redis, Cassandra, Elasticsearch
- **Communication**: gRPC, HTTP/REST, WebSockets
- **Containerization**: Docker, Kubernetes
- **Monitoring**: Prometheus, Grafana, Jaeger

## Getting Started

```bash
# Build the project
mkdir build && cd build
cmake ..
make -j$(nproc)

# Run with Docker Compose
docker-compose up -d
```

## Services

Each service runs independently and communicates via gRPC and HTTP APIs.

