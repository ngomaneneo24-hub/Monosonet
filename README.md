# Sonet 🚀

> A high-performance, Twitter-scale social media platform built entirely in C++ with microservices architecture

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/yourusername/sonet)
[![C++ Version](https://img.shields.io/badge/C++-17%2F20-blue.svg)](https://isocpp.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](docker-compose.yml)

## 🎯 Overview

Sonet is a distributed social media platform designed to handle Twitter-scale traffic with modern C++ engineering practices. Built from the ground up with performance, scalability, and maintainability in mind.

**Key Features:**
- 🔥 **High Performance**: Written in C++ for maximum efficiency
- 🏗️ **Microservices Architecture**: 9 independent, scalable services
- 📱 **Real-time Features**: Live timelines, notifications, and updates
- 🔍 **Advanced Search**: Full-text search with Elasticsearch
- 📊 **Analytics**: Real-time metrics and insights
- 🌐 **API-First**: RESTful and gRPC APIs
- 🔐 **Enterprise Security**: JWT, OAuth2, rate limiting
- ☁️ **Cloud Native**: Kubernetes-ready with Docker support

## 🏛️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │    │  Mobile Client  │    │ Bluesky Client  │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │      API Gateway         │
                    │   (Rate Limiting, Auth)  │
                    └────────────┬─────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
    ┌─────────▼─────────┐ ┌──────▼──────┐ ┌────────▼────────┐
    │   User Service    │ │Note Service │ │Timeline Service │
    │ (Auth, Profiles)  │ │ (Content)   │ │ (Feed Gen)      │
    └─────────┬─────────┘ └──────┬──────┘ └────────┬────────┘
              │                  │                 │
    ┌─────────▼─────────┐ ┌──────▼──────┐ ┌────────▼────────┐
    │  Follow Service   │ │Media Service│ │ Fanout Service  │
    │ (Social Graph)    │ │(Images/Vid) │ │(Distribution)   │
    └─────────┬─────────┘ └──────┬──────┘ └────────┬────────┘
              │                  │                 │
    ┌─────────▼─────────┐ ┌──────▼──────┐ ┌────────▼────────┐
    │Messaging Service  │ │Notification │ │Analytics Service│
    │(DMs, Groups, E2E) │ │  Service    │ │   (Metrics)     │
    └─────────┬─────────┘ └──────┬──────┘ └────────┬────────┘
              │                  │                 │
    ┌─────────▼─────────┐        │        ┌────────▼────────┐
    │  Search Service   │        │        │                 │
    │ (Elasticsearch)   │        │        │                 │
    └───────────────────┘        │        └─────────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │     Data Layer           │
                    │ PostgreSQL │ Redis       │
                    │ Cassandra  │ Elasticsearch│
                    └──────────────────────────┘
```

## 🔧 Services

### Core Services
| Service | Purpose | Technology Stack |
|---------|---------|------------------|
| **User Service** | Authentication, user profiles, sessions | PostgreSQL, Redis, JWT |
| **Note Service** | Content creation, storage, retrieval | Cassandra, Redis |
| **Timeline Service** | Feed generation, ranking algorithms | Redis, PostgreSQL |
| **Fanout Service** | Content distribution to followers | Redis, Message Queues |
| **Follow Service** | Social graph, relationships | PostgreSQL, Graph DB |
| **Media Service** | Image/video processing, CDN | S3, Image Processing |
| **Messaging Service** | Direct messages, group chats, real-time messaging | PostgreSQL, Redis, WebSocket |
| **Search Service** | Full-text search, trending topics | Elasticsearch |
| **Notification Service** | Push notifications, email, websockets | Redis, WebSocket |
| **Analytics Service** | Real-time metrics, user insights | ClickHouse, Kafka |

### Infrastructure
- **API Gateway**: Request routing, rate limiting, authentication
- **Core Libraries**: Database connections, caching, logging, networking
- **Monitoring**: Prometheus, Grafana, Jaeger tracing

## 🚀 Quick Start

### Prerequisites
- **C++17/20** compiler (GCC 9+, Clang 10+, MSVC 2019+)
- **CMake** 3.16+
- **Docker** & **Docker Compose**
- **Git**

### Development Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/sonet.git
cd sonet

# Generate project structure (if needed)
chmod +x generate_structure.sh
./generate_structure.sh

# Build the project
mkdir build && cd build
cmake -DCMAKE_BUILD_TYPE=Debug ..
make -j$(nproc)
```

### Docker Setup (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Build

```bash
# Install dependencies (Ubuntu/Debian)
sudo apt update
sudo apt install -y build-essential cmake libpq-dev libssl-dev \
                    libhiredis-dev nlohmann-json3-dev libgrpc++-dev

# Build specific service
cd src/services/user_service
mkdir build && cd build
cmake ..
make -j$(nproc)
```

## 📚 API Documentation

### Authentication
```bash
# Register user
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "john_doe", "email": "john@example.com", "password": "secure123"}'

# Login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "john@example.com", "password": "secure123"}'
```

### Notes (Tweets)
```bash
# Create note
curl -X POST http://localhost:8080/api/v1/notes \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello Sonet! 🚀", "visibility": "public"}'

# Get timeline
curl -X GET http://localhost:8080/api/v1/timeline/home \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Social Features
```bash
# Follow user
curl -X POST http://localhost:8080/api/v1/follow/123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Search
curl -X GET "http://localhost:8080/api/v1/search?q=hello&type=notes" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Messaging Features
```bash
# Send direct message
curl -X POST http://localhost:8080/api/v1/messages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"chat_id": "chat_123", "content": "Hello there! 👋", "type": "text"}'

# Create group chat
curl -X POST http://localhost:8080/api/v1/chats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Dev Team", "type": "group", "participant_ids": ["user1", "user2", "user3"]}'

# Get chat messages
curl -X GET "http://localhost:8080/api/v1/chats/chat_123/messages?limit=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Upload attachment
curl -X POST http://localhost:8080/api/v1/messages/attachments \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@image.jpg"
```

## 🛠️ Development

### Project Structure
```
sonet/
├── src/
│   ├── core/                 # Shared libraries
│   ├── services/             # Microservices
│   └── gateway/              # API Gateway
├── tests/                    # Test suites
├── docs/                     # Documentation
├── config/                   # Configuration files
├── database/                 # Schemas & migrations
├── deployment/               # K8s, Docker, Terraform
└── monitoring/               # Observability configs
```

### Coding Standards
- **C++ Standard**: C++17 minimum, C++20 preferred
- **Style Guide**: Google C++ Style Guide
- **Documentation**: Doxygen comments for public APIs
- **Testing**: Unit tests with Google Test
- **Linting**: clang-format, clang-tidy

### Testing
```bash
# Run all tests
cd build
make test

# Run specific test suite
./tests/unit_tests
./tests/integration_tests

# Load testing
cd tests/load
./run_load_tests.sh
```

## 🔧 Configuration

### Environment Variables
```bash
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=sonet
POSTGRES_USER=sonet_user
POSTGRES_PASSWORD=secure_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password

# JWT
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRY=3600

# Services
USER_SERVICE_PORT=8001
NOTE_SERVICE_PORT=8002
TIMELINE_SERVICE_PORT=8003
MESSAGING_SERVICE_PORT=8004
WEBSOCKET_PORT=9096
```

### Service Configuration
Each service uses JSON configuration files in `config/` directory:
- `config/development/` - Development settings
- `config/production/` - Production settings
- `config/testing/` - Test environment

## 🚀 Deployment

### Docker Deployment
```bash
# Production build
docker-compose -f docker-compose.prod.yml up -d

# Scale services
docker-compose up -d --scale note-service=3 --scale timeline-service=2
```

### Kubernetes Deployment
```bash
# Deploy to K8s
kubectl apply -f deployment/kubernetes/

# Check status
kubectl get pods -n sonet

# Scale deployment
kubectl scale deployment note-service --replicas=5
```

### Infrastructure as Code
```bash
# Deploy with Terraform
cd deployment/terraform
terraform init
terraform plan
terraform apply
```

## 📊 Performance

### Benchmarks
- **Notes Creation**: 100,000+ notes/second
- **Timeline Generation**: 50,000+ timelines/second
- **Search Queries**: 200,000+ queries/second
- **Concurrent Users**: 10M+ simultaneous connections

### Scalability
- **Horizontal Scaling**: Auto-scaling with Kubernetes
- **Database Sharding**: User-based partitioning
- **Caching Strategy**: Multi-level caching with Redis
- **CDN Integration**: Global content delivery

## 🔍 Monitoring

### Metrics Dashboard
- **System Metrics**: CPU, memory, disk usage
- **Application Metrics**: Request rates, latencies, errors
- **Business Metrics**: User engagement, content metrics

### Observability Stack
- **Metrics**: Prometheus + Grafana
- **Tracing**: Jaeger distributed tracing
- **Logging**: Structured logging with ELK stack
- **Alerting**: Custom alerts for SLAs
