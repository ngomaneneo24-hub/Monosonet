# 🌍 Sonet Monorepo Environment Configuration

## **Overview**

This document describes the unified environment configuration system for the Sonet monorepo. The system provides centralized management of environment variables across all services while maintaining security and flexibility.

## **🏗️ Architecture**

```
sonet-monorepo/
├── .env.example                 # Root environment template
├── .env                        # Root environment (gitignored)
├── scripts/env-manager.js      # Environment management tool
├── sonet-client/
│   ├── .env.example           # Client-specific environment
│   └── src/env/               # Client environment configuration
├── gateway/
│   ├── .env.example           # Gateway-specific environment
│   └── src/config/            # Gateway environment configuration
└── sonet/
    ├── .env.example           # Services-specific environment
    ├── docker-compose.env.yml # Docker environment template
    └── src/config/            # C++ environment configuration
```

## **🔧 Quick Start**

### **1. Initial Setup**

```bash
# Install dependencies
npm install dotenv

# Run environment setup
node scripts/env-manager.js setup

# Copy and configure environment files
cp .env.example .env
cp sonet-client/.env.example sonet-client/.env
cp gateway/.env.example gateway/.env
cp sonet/.env.example sonet/.env
```

### **2. Environment Management Commands**

```bash
# Show environment status
node scripts/env-manager.js status

# Generate service environment files
node scripts/env-manager.js generate

# Update Docker Compose
node scripts/env-manager.js docker

# Full setup
node scripts/env-manager.js setup
```

## **📋 Environment Variables Reference**

### **Global Configuration**

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Node.js environment | `development` | No |
| `ENVIRONMENT` | Application environment | `development` | No |
| `APP_VERSION` | Application version | `1.0.0` | No |
| `BUILD_DATE` | Build date | `20250101` | No |
| `COMMIT_HASH` | Git commit hash | `dev` | No |

### **Client Configuration (sonet-client/)**

#### **Expo Public Variables**
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `EXPO_PUBLIC_ENV` | Client environment | `development` | No |
| `EXPO_PUBLIC_RELEASE_VERSION` | Release version | `1.0.0` | No |
| `EXPO_PUBLIC_BUNDLE_IDENTIFIER` | Bundle identifier | `dev` | No |
| `EXPO_PUBLIC_LOG_LEVEL` | Log level | `info` | No |

#### **Sonet API Configuration**
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `EXPO_PUBLIC_SONET_API_BASE` | API base URL | `http://localhost:8080/api` | Yes |
| `EXPO_PUBLIC_SONET_WS_BASE` | WebSocket base URL | `ws://localhost:8080` | Yes |
| `EXPO_PUBLIC_SONET_CDN_BASE` | CDN base URL | `http://localhost:8080/cdn` | Yes |

#### **Feature Flags**
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `EXPO_PUBLIC_USE_SONET_MESSAGING` | Enable messaging | `true` | No |
| `EXPO_PUBLIC_USE_SONET_E2E_ENCRYPTION` | Enable E2E encryption | `true` | No |
| `EXPO_PUBLIC_USE_SONET_REALTIME` | Enable real-time features | `true` | No |
| `EXPO_PUBLIC_USE_SONET_ANALYTICS` | Enable analytics | `true` | No |
| `EXPO_PUBLIC_USE_SONET_MODERATION` | Enable moderation | `true` | No |

### **Gateway Configuration (gateway/)**

#### **Server Configuration**
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `GATEWAY_PORT` | Server port | `8080` | No |
| `GATEWAY_HOST` | Server host | `0.0.0.0` | No |
| `GATEWAY_CORS_ORIGIN` | CORS origins | `localhost:3000,19006` | No |

#### **JWT Configuration**
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `JWT_SECRET` | JWT secret key | `dev_jwt_secret_key_change_in_production` | **Yes** |
| `JWT_EXPIRES_IN` | JWT expiration | `7d` | No |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiration | `30d` | No |

#### **Rate Limiting**
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `RATE_LIMIT_ENABLED` | Enable rate limiting | `true` | No |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` | No |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` | No |

### **Services Configuration (sonet/)**

#### **Database Configuration**
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `postgres_host` | postgresql host | `localhost` | No |
| `postgres_port` | postgresql port | `5432` | No |
| `postgres_user` | postgresql user | `sonet` | No |
| `postgres_password` | postgresql password | `sonet_dev_password` | **Yes** |
| `postgres_db` | postgresql database | `sonet_dev` | No |
| `postgres_ssl_mode` | SSL mode | `disable` | No |

#### **Redis Configuration**
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `REDIS_HOST` | Redis host | `localhost` | No |
| `REDIS_PORT` | Redis port | `6379` | No |
| `REDIS_PASSWORD` | Redis password | `` | No |
| `REDIS_DB` | Redis database | `0` | No |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` | No |

#### **Service Ports**
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `USER_SERVICE_PORT` | User service port | `8081` | No |
| `USER_SERVICE_GRPC_PORT` | User service gRPC port | `9090` | No |
| `NOTE_SERVICE_PORT` | Note service port | `8082` | No |
| `NOTE_SERVICE_GRPC_PORT` | Note service gRPC port | `9091` | No |
| `MEDIA_SERVICE_PORT` | Media service port | `8083` | No |
| `MEDIA_SERVICE_GRPC_PORT` | Media service gRPC port | `9092` | No |
| `FOLLOW_SERVICE_PORT` | Follow service port | `8084` | No |
| `FOLLOW_SERVICE_GRPC_PORT` | Follow service gRPC port | `9093` | No |
| `NOTIFICATION_SERVICE_PORT` | Notification service port | `8085` | No |
| `NOTIFICATION_SERVICE_GRPC_PORT` | Notification service gRPC port | `9094` | No |
| `MESSAGING_SERVICE_PORT` | Messaging service port | `8086` | No |
| `MESSAGING_SERVICE_GRPC_PORT` | Messaging service gRPC port | `9095` | No |
| `TIMELINE_SERVICE_PORT` | Timeline service port | `8087` | No |
| `TIMELINE_SERVICE_GRPC_PORT` | Timeline service gRPC port | `50051` | No |
| `SEARCH_SERVICE_PORT` | Search service port | `8088` | No |
| `SEARCH_SERVICE_GRPC_PORT` | Search service gRPC port | `9096` | No |
| `ANALYTICS_SERVICE_PORT` | Analytics service port | `8089` | No |
| `ANALYTICS_SERVICE_GRPC_PORT` | Analytics service gRPC port | `9097` | No |

## **🔐 Security Considerations**

### **Required Variables**
- `JWT_SECRET` - Must be changed in production
- `postgres_password` - Database password

### **Production Requirements**
- All default passwords must be changed
- JWT secrets must be strong and unique
- SSL/TLS must be enabled for databases
- Rate limiting should be enabled
- Monitoring and logging should be configured

### **Environment-Specific Security**

#### **Development**
- Default passwords allowed
- Debug logging enabled
- Rate limiting disabled
- CORS open

#### **Staging**
- Strong passwords required
- Info logging
- Rate limiting enabled
- CORS restricted

#### **Production**
- Strong passwords required
- Warning logging only
- Rate limiting enabled
- CORS restricted
- SSL/TLS required

## **🚀 Environment-Specific Configurations**

### **Development Environment**
```bash
NODE_ENV=development
LOG_LEVEL=debug
DEBUG=sonet:*
WATCH_MODE=true
AUTO_RESTART=true
```

### **Staging Environment**
```bash
NODE_ENV=staging
LOG_LEVEL=info
DEBUG=
WATCH_MODE=false
AUTO_RESTART=false
```

### **Production Environment**
```bash
NODE_ENV=production
LOG_LEVEL=warn
DEBUG=
WATCH_MODE=false
AUTO_RESTART=false
```

## **📱 Client Environment Configuration**

### **Environment-Specific Settings**
```typescript
import { getCurrentEnvConfig } from '#/env/common'

const config = getCurrentEnvConfig()

// Access environment-specific configuration
console.log(config.apiBase)    // http://localhost:8080/api
console.log(config.wsBase)     // ws://localhost:8080
console.log(config.cdnBase)    // http://localhost:8080/cdn
console.log(config.logLevel)   // debug
```

### **Feature Flag Usage**
```typescript
import { 
  USE_SONET_MESSAGING, 
  USE_SONET_E2E_ENCRYPTION,
  USE_SONET_REALTIME 
} from '#/env/common'

if (USE_SONET_MESSAGING) {
  // Initialize messaging system
}

if (USE_SONET_E2E_ENCRYPTION) {
  // Enable end-to-end encryption
}

if (USE_SONET_REALTIME) {
  // Enable real-time features
}
```

## **🔧 Gateway Environment Configuration**

### **Configuration Usage**
```typescript
import { getConfig } from './config/environment'

const config = getConfig()

// Access server configuration
console.log(config.server.port)        // 8080
console.log(config.server.host)        // 0.0.0.0
console.log(config.server.corsOrigin)  // ['localhost:3000', 'localhost:19006']

// Access JWT configuration
console.log(config.jwt.secret)         // JWT secret
console.log(config.jwt.expiresIn)      // 7d

// Access database configuration
console.log(config.database.postgres.host)     // localhost
console.log(config.database.redis.url)         // redis://localhost:6379
```

### **Environment Validation**
```typescript
import { validateEnvironment } from './config/environment'

// Validate environment before starting server
if (!validateEnvironment()) {
  console.error('Environment validation failed')
  process.exit(1)
}
```

## **⚙️ C++ Services Environment Configuration**

### **Configuration Usage**
```cpp
#include "config/environment.hpp"

int main() {
    // Initialize configuration
    sonet::config::initializeConfig();
    
    // Access configuration
    auto& config = sonet::config::globalConfig;
    
    std::cout << "Service: " << config.service.name << std::endl;
    std::cout << "Port: " << config.service.port << std::endl;
    std::cout << "Database: " << config.database.getConnectionString() << std::endl;
    std::cout << "Redis: " << config.redis.getConnectionString() << std::endl;
    
    return 0;
}
```

### **Environment Helper Functions**
```cpp
#include "config/environment.hpp"

// Get environment variables with defaults
std::string apiKey = sonet::config::Environment::get("API_KEY", "default_key");
int port = sonet::config::Environment::getInt("PORT", 8080);
bool debug = sonet::config::Environment::getBool("DEBUG", false);
double threshold = sonet::config::Environment::getDouble("THRESHOLD", 0.8);

// Get comma-separated lists
auto allowedTypes = sonet::config::Environment::getList("ALLOWED_TYPES", {"default"});
```

## **🐳 Docker Environment Configuration**

### **Docker Compose Environment File**
```bash
# Copy environment template
cp sonet/docker-compose.env.yml sonet/.env

# Edit environment variables
nano sonet/.env

# Start services with environment
docker-compose --env-file .env up -d
```

### **Environment Variable Updates**
```bash
# Update Docker Compose with environment variables
node scripts/env-manager.js docker
```

## **📊 Monitoring & Analytics Configuration**

### **Sentry Configuration**
```bash
SENTRY_DSN=your-sentry-dsn
SENTRY_ORG=sonet
SENTRY_PROJECT=sonet-app
SENTRY_AUTH_TOKEN=your-auth-token
```

### **Logging Configuration**
```bash
LOG_LEVEL=debug
LOG_FORMAT=json
LOG_DESTINATION=console
```

### **External Services**
```bash
# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Push Notifications (Firebase)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# CDN
CDN_PROVIDER=aws
CDN_BASE_URL=https://cdn.sonet.app
CDN_REGION=us-east-1
CDN_ACCESS_KEY_ID=your-access-key
CDN_SECRET_ACCESS_KEY=your-secret-key
```

## **🧪 Testing Environment Configuration**

### **Test Database Configuration**
```bash
# Test environment variables
TEST_DATABASE_URL=postgresql://sonet:sonet_test_password@localhost:5433/sonet_test
TEST_REDIS_URL=redis://localhost:6380

# Test configuration
TEST_TIMEOUT=10000
TEST_RETRIES=3
COVERAGE_ENABLED=true
```

### **Test Environment Setup**
```bash
# Create test environment file
cp .env.example .env.test

# Modify for testing
sed -i 's/sonet_dev/sonet_test/g' .env.test
sed -i 's/5432/5433/g' .env.test
sed -i 's/6379/6380/g' .env.test

# Run tests with test environment
NODE_ENV=test npm test
```

## **🚀 Production Deployment**

### **Production Environment Template**
```bash
# Production environment variables
NODE_ENV=production
ENVIRONMENT=production
LOG_LEVEL=warn

# Production overrides
postgres_host=${DB_HOST}
postgres_password=${DB_PASSWORD}
REDIS_HOST=${REDIS_HOST}
JWT_SECRET=${JWT_SECRET}

# External services
CDN_BASE_URL=https://cdn.sonet.app
SONET_API_BASE=https://api.sonet.app
SONET_WS_BASE=wss://api.sonet.app

# Monitoring
SENTRY_DSN=${SENTRY_DSN}
SENTRY_ORG=sonet
SENTRY_PROJECT=sonet-app
```

### **Production Deployment Steps**
1. **Copy production template**
   ```bash
   cp .env.production.template .env.production
   ```

2. **Set production values**
   ```bash
   export DB_HOST=your-db-host
   export DB_PASSWORD=your-db-password
   export REDIS_HOST=your-redis-host
   export JWT_SECRET=your-jwt-secret
   export SENTRY_DSN=your-sentry-dsn
   ```

3. **Deploy with production environment**
   ```bash
   docker-compose --env-file .env.production up -d
   ```

## **🔍 Troubleshooting**

### **Common Issues**

#### **Missing Environment Variables**
```bash
# Check environment status
node scripts/env-manager.js status

# Validate environment
node scripts/env-manager.js validate
```

#### **Configuration Validation Failed**
- Check required variables are set
- Verify JWT secret is changed in production
- Ensure database passwords are set

#### **Service Connection Issues**
- Verify service ports are correct
- Check database connection strings
- Ensure Redis is accessible

### **Debug Commands**
```bash
# Show all environment variables
env | grep SONET

# Check specific service configuration
cd sonet-client && npm run env:check
cd gateway && npm run env:check
cd sonet && make env:check
```

## **📚 Additional Resources**

- [Environment Manager Script](../scripts/env-manager.js)
- [Client Environment Configuration](../sonet-client/src/env/)
- [Gateway Environment Configuration](../gateway/src/config/)
- [Services Environment Configuration](../sonet/src/config/)
- [Docker Compose Environment](../sonet/docker-compose.env.yml)

## **🤝 Contributing**

When adding new environment variables:

1. **Update root `.env.example`**
2. **Update service-specific `.env.example` files**
3. **Update environment configuration files**
4. **Update this documentation**
5. **Add validation rules if required**

## **📄 License**

This environment configuration system is part of the Sonet monorepo and follows the same licensing terms.