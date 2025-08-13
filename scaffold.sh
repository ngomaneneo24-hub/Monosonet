#!/bin/bash

# Sonet - Twitter-like Social Media Platform in C++
# Project Structure Generator Script

echo "🚀 Creating Sonet project structure..."

# Create root directory
mkdir -p sonet
cd sonet

# Core project files
touch README.md
touch .gitignore
touch CMakeLists.txt
touch docker-compose.yml
touch Dockerfile
touch .env.example

# Documentation
mkdir -p docs/{api,architecture,deployment,development}
touch docs/README.md
touch docs/api/endpoints.md
touch docs/api/authentication.md
touch docs/api/rate-limiting.md
touch docs/architecture/system-design.md
touch docs/architecture/database-schema.md
touch docs/architecture/microservices.md
touch docs/deployment/docker.md
touch docs/deployment/kubernetes.md
touch docs/development/coding-standards.md
touch docs/development/testing.md

# Configuration and Environment
mkdir -p config/{development,production,testing}
touch config/development/database.json
touch config/development/redis.json
touch config/development/services.json
touch config/production/database.json
touch config/production/redis.json
touch config/production/services.json
touch config/testing/database.json
touch config/testing/redis.json
touch config/testing/services.json

# Scripts for automation
mkdir -p scripts/{build,deploy,database,testing}
touch scripts/build/build.sh
touch scripts/build/clean.sh
touch scripts/deploy/deploy.sh
touch scripts/deploy/rollback.sh
touch scripts/database/migrate.sh
touch scripts/database/seed.sh
touch scripts/testing/run-tests.sh
touch scripts/testing/integration-tests.sh

# Core libraries and shared components
mkdir -p src/core/{database,cache,logging,config,crypto,validation,serialization}
mkdir -p src/core/network/{http,grpc,websocket}
mkdir -p src/core/utils/{string,time,uuid,hash}
mkdir -p src/core/security/{auth,rate_limiter,sanitizer}

# Core headers and implementations
touch src/core/database/connection_pool.h
touch src/core/database/connection_pool.cpp
touch src/core/database/query_builder.h
touch src/core/database/query_builder.cpp
touch src/core/database/transaction.h
touch src/core/database/transaction.cpp

touch src/core/cache/redis_client.h
touch src/core/cache/redis_client.cpp
touch src/core/cache/cache_manager.h
touch src/core/cache/cache_manager.cpp

touch src/core/logging/logger.h
touch src/core/logging/logger.cpp
touch src/core/logging/log_formatter.h
touch src/core/logging/log_formatter.cpp

touch src/core/config/config_manager.h
touch src/core/config/config_manager.cpp
touch src/core/config/env_loader.h
touch src/core/config/env_loader.cpp

touch src/core/network/http/http_server.h
touch src/core/network/http/http_server.cpp
touch src/core/network/http/http_client.h
touch src/core/network/http/http_client.cpp
touch src/core/network/http/middleware.h
touch src/core/network/http/middleware.cpp

touch src/core/network/grpc/grpc_server.h
touch src/core/network/grpc/grpc_server.cpp
touch src/core/network/grpc/grpc_client.h
touch src/core/network/grpc/grpc_client.cpp

touch src/core/network/websocket/ws_server.h
touch src/core/network/websocket/ws_server.cpp
touch src/core/network/websocket/ws_handler.h
touch src/core/network/websocket/ws_handler.cpp

# Microservices
echo "Creating microservices structure..."

# User Service
mkdir -p src/services/user_service/{controllers,models,repositories,validators,handlers}
mkdir -p src/services/user_service/proto
touch src/services/user_service/main.cpp
touch src/services/user_service/service.h
touch src/services/user_service/service.cpp
touch src/services/user_service/CMakeLists.txt

touch src/services/user_service/controllers/user_controller.h
touch src/services/user_service/controllers/user_controller.cpp
touch src/services/user_service/controllers/auth_controller.h
touch src/services/user_service/controllers/auth_controller.cpp
touch src/services/user_service/controllers/profile_controller.h
touch src/services/user_service/controllers/profile_controller.cpp

touch src/services/user_service/models/user.h
touch src/services/user_service/models/user.cpp
touch src/services/user_service/models/profile.h
touch src/services/user_service/models/profile.cpp
touch src/services/user_service/models/session.h
touch src/services/user_service/models/session.cpp

touch src/services/user_service/repositories/user_repository.h
touch src/services/user_service/repositories/user_repository.cpp
touch src/services/user_service/repositories/profile_repository.h
touch src/services/user_service/repositories/profile_repository.cpp

touch src/services/user_service/validators/user_validator.h
touch src/services/user_service/validators/user_validator.cpp

touch src/services/user_service/proto/user_service.proto

# Note Service (Tweet equivalent)
mkdir -p src/services/note_service/{controllers,models,repositories,validators,handlers}
mkdir -p src/services/note_service/proto
touch src/services/note_service/main.cpp
touch src/services/note_service/service.h
touch src/services/note_service/service.cpp
touch src/services/note_service/CMakeLists.txt

touch src/services/note_service/controllers/note_controller.h
touch src/services/note_service/controllers/note_controller.cpp
touch src/services/note_service/controllers/thread_controller.h
touch src/services/note_service/controllers/thread_controller.cpp

touch src/services/note_service/models/note.h
touch src/services/note_service/models/note.cpp
touch src/services/note_service/models/thread.h
touch src/services/note_service/models/thread.cpp
touch src/services/note_service/models/attachment.h
touch src/services/note_service/models/attachment.cpp

touch src/services/note_service/repositories/note_repository.h
touch src/services/note_service/repositories/note_repository.cpp
touch src/services/note_service/repositories/thread_repository.h
touch src/services/note_service/repositories/thread_repository.cpp

touch src/services/note_service/validators/note_validator.h
touch src/services/note_service/validators/note_validator.cpp

touch src/services/note_service/proto/note_service.proto

# Timeline Service
mkdir -p src/services/timeline_service/{controllers,models,repositories,generators,rankers}
mkdir -p src/services/timeline_service/proto
touch src/services/timeline_service/main.cpp
touch src/services/timeline_service/service.h
touch src/services/timeline_service/service.cpp
touch src/services/timeline_service/CMakeLists.txt

touch src/services/timeline_service/controllers/timeline_controller.h
touch src/services/timeline_service/controllers/timeline_controller.cpp
touch src/services/timeline_service/controllers/feed_controller.h
touch src/services/timeline_service/controllers/feed_controller.cpp

touch src/services/timeline_service/models/timeline.h
touch src/services/timeline_service/models/timeline.cpp
touch src/services/timeline_service/models/timeline_entry.h
touch src/services/timeline_service/models/timeline_entry.cpp

touch src/services/timeline_service/generators/home_timeline_generator.h
touch src/services/timeline_service/generators/home_timeline_generator.cpp
touch src/services/timeline_service/generators/user_timeline_generator.h
touch src/services/timeline_service/generators/user_timeline_generator.cpp

touch src/services/timeline_service/rankers/chronological_ranker.h
touch src/services/timeline_service/rankers/chronological_ranker.cpp
touch src/services/timeline_service/rankers/algorithmic_ranker.h
touch src/services/timeline_service/rankers/algorithmic_ranker.cpp

touch src/services/timeline_service/proto/timeline_service.proto

# Fanout Service
mkdir -p src/services/fanout_service/{controllers,models,processors,queues}
mkdir -p src/services/fanout_service/proto
touch src/services/fanout_service/main.cpp
touch src/services/fanout_service/service.h
touch src/services/fanout_service/service.cpp
touch src/services/fanout_service/CMakeLists.txt

touch src/services/fanout_service/controllers/fanout_controller.h
touch src/services/fanout_service/controllers/fanout_controller.cpp

touch src/services/fanout_service/processors/push_processor.h
touch src/services/fanout_service/processors/push_processor.cpp
touch src/services/fanout_service/processors/pull_processor.h
touch src/services/fanout_service/processors/pull_processor.cpp

touch src/services/fanout_service/queues/fanout_queue.h
touch src/services/fanout_service/queues/fanout_queue.cpp
touch src/services/fanout_service/queues/priority_queue.h
touch src/services/fanout_service/queues/priority_queue.cpp

touch src/services/fanout_service/proto/fanout_service.proto

# Follow Service (Relationship management)
mkdir -p src/services/follow_service/{controllers,models,repositories,graph}
mkdir -p src/services/follow_service/proto
touch src/services/follow_service/main.cpp
touch src/services/follow_service/service.h
touch src/services/follow_service/service.cpp
touch src/services/follow_service/CMakeLists.txt

touch src/services/follow_service/controllers/follow_controller.h
touch src/services/follow_service/controllers/follow_controller.cpp
touch src/services/follow_service/controllers/block_controller.h
touch src/services/follow_service/controllers/block_controller.cpp

touch src/services/follow_service/models/relationship.h
touch src/services/follow_service/models/relationship.cpp
touch src/services/follow_service/models/follow.h
touch src/services/follow_service/models/follow.cpp

touch src/services/follow_service/repositories/relationship_repository.h
touch src/services/follow_service/repositories/relationship_repository.cpp

touch src/services/follow_service/graph/social_graph.h
touch src/services/follow_service/graph/social_graph.cpp

touch src/services/follow_service/proto/follow_service.proto

# Media Service
mkdir -p src/services/media_service/{controllers,models,repositories,processors,storage}
mkdir -p src/services/media_service/proto
touch src/services/media_service/main.cpp
touch src/services/media_service/service.h
touch src/services/media_service/service.cpp
touch src/services/media_service/CMakeLists.txt

touch src/services/media_service/controllers/media_controller.h
touch src/services/media_service/controllers/media_controller.cpp
touch src/services/media_service/controllers/upload_controller.h
touch src/services/media_service/controllers/upload_controller.cpp

touch src/services/media_service/models/media.h
touch src/services/media_service/models/media.cpp
touch src/services/media_service/models/media_metadata.h
touch src/services/media_service/models/media_metadata.cpp

touch src/services/media_service/processors/image_processor.h
touch src/services/media_service/processors/image_processor.cpp
touch src/services/media_service/processors/video_processor.h
touch src/services/media_service/processors/video_processor.cpp

touch src/services/media_service/storage/s3_storage.h
touch src/services/media_service/storage/s3_storage.cpp
touch src/services/media_service/storage/local_storage.h
touch src/services/media_service/storage/local_storage.cpp

touch src/services/media_service/proto/media_service.proto

# Search Service
mkdir -p src/services/search_service/{controllers,models,indexers,engines}
mkdir -p src/services/search_service/proto
touch src/services/search_service/main.cpp
touch src/services/search_service/service.h
touch src/services/search_service/service.cpp
touch src/services/search_service/CMakeLists.txt

touch src/services/search_service/controllers/search_controller.h
touch src/services/search_service/controllers/search_controller.cpp

touch src/services/search_service/models/search_result.h
touch src/services/search_service/models/search_result.cpp
touch src/services/search_service/models/search_query.h
touch src/services/search_service/models/search_query.cpp

touch src/services/search_service/indexers/note_indexer.h
touch src/services/search_service/indexers/note_indexer.cpp
touch src/services/search_service/indexers/user_indexer.h
touch src/services/search_service/indexers/user_indexer.cpp

touch src/services/search_service/engines/elasticsearch_engine.h
touch src/services/search_service/engines/elasticsearch_engine.cpp

touch src/services/search_service/proto/search_service.proto

# Notification Service
mkdir -p src/services/notification_service/{controllers,models,repositories,processors,channels}
mkdir -p src/services/notification_service/proto
touch src/services/notification_service/main.cpp
touch src/services/notification_service/service.h
touch src/services/notification_service/service.cpp
touch src/services/notification_service/CMakeLists.txt

touch src/services/notification_service/controllers/notification_controller.h
touch src/services/notification_service/controllers/notification_controller.cpp

touch src/services/notification_service/models/notification.h
touch src/services/notification_service/models/notification.cpp
touch src/services/notification_service/models/notification_template.h
touch src/services/notification_service/models/notification_template.cpp

touch src/services/notification_service/processors/notification_processor.h
touch src/services/notification_service/processors/notification_processor.cpp

touch src/services/notification_service/channels/push_channel.h
touch src/services/notification_service/channels/push_channel.cpp
touch src/services/notification_service/channels/email_channel.h
touch src/services/notification_service/channels/email_channel.cpp
touch src/services/notification_service/channels/websocket_channel.h
touch src/services/notification_service/channels/websocket_channel.cpp

touch src/services/notification_service/proto/notification_service.proto

# Analytics Service
mkdir -p src/services/analytics_service/{controllers,models,collectors,processors,aggregators}
mkdir -p src/services/analytics_service/proto
touch src/services/analytics_service/main.cpp
touch src/services/analytics_service/service.h
touch src/services/analytics_service/service.cpp
touch src/services/analytics_service/CMakeLists.txt

touch src/services/analytics_service/controllers/analytics_controller.h
touch src/services/analytics_service/controllers/analytics_controller.cpp

touch src/services/analytics_service/models/event.h
touch src/services/analytics_service/models/event.cpp
touch src/services/analytics_service/models/metric.h
touch src/services/analytics_service/models/metric.cpp

touch src/services/analytics_service/collectors/event_collector.h
touch src/services/analytics_service/collectors/event_collector.cpp

touch src/services/analytics_service/processors/stream_processor.h
touch src/services/analytics_service/processors/stream_processor.cpp

touch src/services/analytics_service/aggregators/real_time_aggregator.h
touch src/services/analytics_service/aggregators/real_time_aggregator.cpp

touch src/services/analytics_service/proto/analytics_service.proto

# API Gateway
mkdir -p src/gateway/{controllers,middleware,routing,auth,rate_limiting}
touch src/gateway/main.cpp
touch src/gateway/gateway.h
touch src/gateway/gateway.cpp
touch src/gateway/CMakeLists.txt

touch src/gateway/controllers/api_controller.h
touch src/gateway/controllers/api_controller.cpp

touch src/gateway/middleware/cors_middleware.h
touch src/gateway/middleware/cors_middleware.cpp
touch src/gateway/middleware/auth_middleware.h
touch src/gateway/middleware/auth_middleware.cpp
touch src/gateway/middleware/logging_middleware.h
touch src/gateway/middleware/logging_middleware.cpp

touch src/gateway/routing/router.h
touch src/gateway/routing/router.cpp
touch src/gateway/routing/route_matcher.h
touch src/gateway/routing/route_matcher.cpp

touch src/gateway/auth/jwt_handler.h
touch src/gateway/auth/jwt_handler.cpp
touch src/gateway/auth/oauth_handler.h
touch src/gateway/auth/oauth_handler.cpp

touch src/gateway/rate_limiting/rate_limiter.h
touch src/gateway/rate_limiting/rate_limiter.cpp
touch src/gateway/rate_limiting/token_bucket.h
touch src/gateway/rate_limiting/token_bucket.cpp

# External libraries and dependencies
mkdir -p external/{json,http,grpc,redis,database}
touch external/CMakeLists.txt

# Database migrations and schemas
mkdir -p database/{migrations,schemas,seeds}
mkdir -p database/migrations/{user_service,note_service,follow_service,media_service,notification_service}

touch database/schemas/user_schema.sql
touch database/schemas/note_schema.sql
touch database/schemas/follow_schema.sql
touch database/schemas/media_schema.sql
touch database/schemas/notification_schema.sql
touch database/schemas/analytics_schema.sql

touch database/seeds/dev_users.sql
touch database/seeds/dev_notes.sql
touch database/seeds/dev_follows.sql

# Testing structure
mkdir -p tests/{unit,integration,load,e2e}
mkdir -p tests/unit/{core,services,gateway}
mkdir -p tests/integration/{services,database}
mkdir -p tests/load/{scenarios,scripts}
mkdir -p tests/e2e/{scenarios,fixtures}

touch tests/CMakeLists.txt
touch tests/test_main.cpp

# Unit tests for each service
touch tests/unit/services/test_user_service.cpp
touch tests/unit/services/test_note_service.cpp
touch tests/unit/services/test_timeline_service.cpp
touch tests/unit/services/test_fanout_service.cpp
touch tests/unit/services/test_follow_service.cpp
touch tests/unit/services/test_media_service.cpp
touch tests/unit/services/test_search_service.cpp
touch tests/unit/services/test_notification_service.cpp
touch tests/unit/services/test_analytics_service.cpp

# Core component tests
touch tests/unit/core/test_database.cpp
touch tests/unit/core/test_cache.cpp
touch tests/unit/core/test_logger.cpp
touch tests/unit/core/test_config.cpp
touch tests/unit/core/test_http_server.cpp

# Integration tests
touch tests/integration/services/test_service_communication.cpp
touch tests/integration/database/test_database_operations.cpp

# Load testing
touch tests/load/scenarios/note_creation_load.cpp
touch tests/load/scenarios/timeline_load.cpp
touch tests/load/scenarios/search_load.cpp

# End-to-end tests
touch tests/e2e/scenarios/user_journey.cpp
touch tests/e2e/scenarios/note_lifecycle.cpp

# Monitoring and observability
mkdir -p monitoring/{prometheus,grafana,jaeger}
touch monitoring/prometheus/prometheus.yml
touch monitoring/grafana/dashboards.json
touch monitoring/jaeger/jaeger-config.yml

# Deployment configurations
mkdir -p deployment/{kubernetes,docker,terraform}
mkdir -p deployment/kubernetes/{services,deployments,configmaps,secrets}
mkdir -p deployment/docker/{services,nginx}
mkdir -p deployment/terraform/{aws,gcp,azure}

# Kubernetes manifests
touch deployment/kubernetes/namespace.yml
touch deployment/kubernetes/services/user-service.yml
touch deployment/kubernetes/services/note-service.yml
touch deployment/kubernetes/services/timeline-service.yml
touch deployment/kubernetes/services/fanout-service.yml
touch deployment/kubernetes/services/follow-service.yml
touch deployment/kubernetes/services/media-service.yml
touch deployment/kubernetes/services/search-service.yml
touch deployment/kubernetes/services/notification-service.yml
touch deployment/kubernetes/services/analytics-service.yml
touch deployment/kubernetes/services/gateway.yml

touch deployment/kubernetes/deployments/user-service-deployment.yml
touch deployment/kubernetes/deployments/note-service-deployment.yml
touch deployment/kubernetes/deployments/timeline-service-deployment.yml
touch deployment/kubernetes/deployments/gateway-deployment.yml

touch deployment/kubernetes/configmaps/app-config.yml
touch deployment/kubernetes/secrets/app-secrets.yml

# Docker configurations
touch deployment/docker/services/Dockerfile.user-service
touch deployment/docker/services/Dockerfile.note-service
touch deployment/docker/services/Dockerfile.timeline-service
touch deployment/docker/services/Dockerfile.gateway
touch deployment/docker/nginx/nginx.conf

# Terraform for infrastructure
touch deployment/terraform/main.tf
touch deployment/terraform/variables.tf
touch deployment/terraform/outputs.tf

# Tools and utilities
mkdir -p tools/{generators,analyzers,benchmarks}
touch tools/generators/service_generator.cpp
touch tools/generators/model_generator.cpp
touch tools/analyzers/dependency_analyzer.cpp
touch tools/benchmarks/performance_benchmark.cpp

# Proto files for gRPC
mkdir -p proto/{common,services}
touch proto/common/common.proto
touch proto/common/timestamp.proto
touch proto/common/pagination.proto
touch proto/services/user.proto
touch proto/services/note.proto
touch proto/services/timeline.proto
touch proto/services/fanout.proto
touch proto/services/follow.proto
touch proto/services/media.proto
touch proto/services/search.proto
touch proto/services/notification.proto
touch proto/services/analytics.proto

# Build system files
touch CMakeLists.txt
touch conanfile.txt
touch Makefile

# Create some basic content for key files
cat > README.md << 'EOF'
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
- **Databases**: postgresql, Redis, Cassandra, Elasticsearch
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

EOF

cat > .gitignore << 'EOF'
# Build directories
build/
cmake-build-*/
bin/
lib/

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# Compiled files
*.o
*.a
*.so
*.dylib
*.exe

# Logs
*.log
logs/

# Environment files
.env
*.env

# Database files
*.db
*.sqlite

# Cache files
.cache/
node_modules/

# OS files
.DS_Store
Thumbs.db

# Coverage files
coverage/
*.gcov
*.gcda
*.gcno

# Profiling files
*.prof
gmon.out

# Core dumps
core.*
EOF

echo "✅ Sonet project structure created successfully!"
echo ""
echo "📁 Project structure overview:"
echo "├── 🏗️  Core infrastructure (database, cache, networking)"
echo "├── 🔧  9 Microservices with full MVC structure"
echo "├── 🌐  API Gateway with middleware"
echo "├── 🧪  Comprehensive testing suite"
echo "├── 📊  Monitoring and observability"
echo "├── 🚀  Deployment configurations (K8s, Docker, Terraform)"
echo "├── 🛠️  Build system and tooling"
echo "└── 📚  Documentation and schemas"
echo ""
echo "🎯 Next steps:"
echo "1. cd sonet"
echo "2. Set up your development environment"
echo "3. Start with the User Service or Core infrastructure"
echo "4. Configure your databases and external services"
echo ""
echo "Happy coding! 🚀"
