# 🚀 Overdrive - TikTok-Scale ML-Powered Feed System

Overdrive is a production-ready, ML-powered recommendation system that makes your "For You" feed as addictive and personalized as TikTok's. It combines cold start recommendations, user interest learning, and advanced ML models to deliver scary-good personalized content.

## ✨ Features

### 🧠 **Cold Start System**
- **Interest-Based Recommendations**: Uses user interests from signup to provide immediate personalized content
- **Gradual Learning**: Transitions from cold start to ML-powered recommendations as users interact
- **Interest Mapping**: Sophisticated content-interest matching with quality thresholds
- **Diversity Control**: Ensures varied content across different interest categories

### 🤖 **ML Models**
- **Two-Tower Architecture**: User-item matching with shared embedding space
- **Sequence Models**: Transformer-based next-item prediction
- **Feature Engineering**: Advanced text, media, and engagement feature extraction
- **Real-time Scoring**: Low-latency ML inference for live recommendations

### 🔄 **Real-Time Processing**
- **Kafka Integration**: Stream processing of user interactions
- **Redis Feature Store**: High-performance online feature serving
- **gRPC Serving**: C++ backend for ultra-low latency
- **Event Streaming**: Real-time user behavior tracking

### 🎯 **Personalization**
- **User Interest Learning**: Extracts interests from bio, hashtags, and behavior
- **Engagement Optimization**: Maximizes user retention and session duration
- **Content Quality Scoring**: AI-powered content evaluation
- **A/B Testing Ready**: Built-in experimentation framework

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client App   │    │   Gateway       │    │   Timeline      │
│                 │    │                 │    │   Service       │
│ • Overdrive    │───▶│ • x-use-        │───▶│ • Overdrive    │
│   Toggle       │    │   overdrive     │    │   Client        │
└─────────────────┘    │   Header        │    └─────────────────┘
                       └─────────────────┘              │
                                                        │
                                                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   Overdrive     │    │   Overdrive     │
                       │   Python        │    │   C++ Serving   │
                       │                 │    │                 │
                       │ • Cold Start    │◀──▶│ • gRPC Server  │
                       │ • ML Models     │    │ • FAISS Index   │
                       │ • Feature Store │    │ • Redis Client  │
                       └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Data Layer    │
                       │                 │
                       │ • Redis         │
                       │ • Kafka         │
                       │ • ML Models     │
                       └─────────────────┘
```

## 🚀 Quick Start

### 1. **Prerequisites**
```bash
# Install dependencies
pip install -r requirements.txt

# Start Redis
docker run -d -p 6379:6379 redis:alpine

# Start Kafka (or use docker-compose)
docker-compose up -d kafka
```

### 2. **Start All Services**
```bash
# One-command startup
python start_overdrive.py
```

This starts:
- 🐍 Python Overdrive API (port 8088)
- 📨 Kafka Consumer
- ⚡ C++ gRPC Serving (port 50051)
- 🤖 ML Model Training

### 3. **Enable in Client**
```typescript
// Import the API
import {overdriveAPI} from '#/lib/api/feed/overdrive'

// Enable Overdrive
overdriveAPI.enableOverdrive()

// Or use the toggle component
<OverdriveToggle onToggle={(enabled) => console.log('Overdrive:', enabled)} />
```

### 4. **Test the System**
```bash
# Check health
curl http://localhost:8088/health

# Test ranking
curl -X POST http://localhost:8088/rank/for-you \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user",
    "candidate_items": [...],
    "limit": 20
  }'
```

## 🔧 Configuration

### Environment Variables
```bash
# Overdrive settings
export OVERDRIVE_KAFKA_BROKERS=localhost:9092
export OVERDRIVE_REDIS_URL=redis://localhost:6379/0
export OVERDRIVE_SERVICE_PORT=8088
export OVERDRIVE_CLIENT_BASE_URL=http://localhost:3000

# Feature store
export OVERDRIVE_FEATURE_TTL_SECONDS=3600
```

### Client Integration
```typescript
// The client automatically sends the x-use-overdrive header
// when Overdrive is enabled via localStorage

// Manual header setting
fetch('/v1/feeds/for-you', {
  headers: {
    'x-use-overdrive': '1'
  }
})
```

## 📊 ML Models

### Two-Tower Model
```python
from overdrive.models.two_tower import TwoTowerModel, TwoTowerTrainer

# Create model
model = TwoTowerModel(
    user_input_dim=128,
    item_input_dim=256,
    shared_dim=128
)

# Train
trainer = TwoTowerTrainer(model)
trainer.train_step(user_features, item_features, labels)
```

### Sequence Model
```python
from overdrive.models.sequence_model import SequenceModel, SequenceTrainer

# Create model
model = SequenceModel(
    item_dim=128,
    hidden_dim=256,
    num_layers=4
)

# Train
trainer = SequenceTrainer(model)
trainer.train_step(sequences, targets, attention_mask)
```

## 🧪 Training

### Train Models
```bash
# Train all models
python -m overdrive.training.train_models \
  --data-dir ./data \
  --output-dir ./models \
  --device cuda

# Train specific model
python -m overdrive.training.train_models \
  --model two-tower \
  --data-dir ./data \
  --output-dir ./models
```

### Data Format
```json
{
  "user_features": {
    "total_interactions": 150,
    "avg_session_duration": 45.2,
    "interests": ["gaming", "technology", "music"]
  },
  "item_features": {
    "text_length": 120,
    "has_media": true,
    "engagement_rate": 0.15
  }
}
```

## 🔍 API Endpoints

### Core Endpoints
- `GET /health` - Service health check
- `GET /features/{user_id}` - Get user features
- `POST /rank/for-you` - Rank items for feed
- `GET /insights/{user_id}` - Get user insights
- `GET /interests/{user_id}` - Get user interests

### Ranking Request
```json
{
  "user_id": "user123",
  "candidate_items": [
    {
      "id": "note1",
      "content": "Check out this amazing content!",
      "hashtags": ["gaming", "fun"],
      "media_types": ["image"],
      "engagement_rate": 0.12,
      "quality_score": 0.8
    }
  ],
  "limit": 20
}
```

## 📈 Monitoring

### Health Checks
```bash
# Python service
curl http://localhost:8088/health

# C++ service
grpc_health_probe -addr=localhost:50051
```

### Metrics
```bash
# Prometheus metrics
curl http://localhost:8088/metrics
```

### Logs
```bash
# Follow logs
tail -f logs/overdrive.log
```

## 🚀 Production Deployment

### Docker
```dockerfile
FROM python:3.11-slim
COPY . /app
WORKDIR /app
RUN pip install -r requirements.txt
CMD ["python", "-m", "overdrive.cli", "api"]
```

### Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: overdrive
spec:
  replicas: 3
  selector:
    matchLabels:
      app: overdrive
  template:
    spec:
      containers:
      - name: overdrive
        image: overdrive:latest
        ports:
        - containerPort: 8088
```

### Scaling
- **Horizontal**: Multiple Python API instances
- **Vertical**: GPU acceleration for ML models
- **Caching**: Redis cluster for feature store
- **Load Balancing**: gRPC load balancer for C++ serving

## 🔒 Security

### Authentication
- Bearer token validation
- User ID verification
- Rate limiting

### Data Privacy
- Local feature processing
- Encrypted feature storage
- GDPR compliance ready

## 🧪 Testing

### Unit Tests
```bash
pytest tests/
```

### Integration Tests
```bash
# Test full pipeline
python -m pytest tests/integration/
```

### Load Testing
```bash
# Benchmark ranking performance
python -m pytest tests/load/ -v
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Documentation**: This README
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Email**: support@overdrive.dev

---

**Overdrive**: Making your feed as addictive as TikTok's, one recommendation at a time! 🚀✨