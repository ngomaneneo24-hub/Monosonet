#!/usr/bin/env node

/**
 * Sonet Monorepo Environment Configuration Manager (Simplified)
 * Manages environment variables across all services without external dependencies
 */

const fs = require('fs');
const path = require('path');

class EnvironmentManager {
  constructor() {
    this.rootDir = path.resolve(__dirname, '..');
    this.services = [
      'sonet-client',
      'gateway',
      'sonet'
    ];
  }

  /**
   * Load environment variables from file (simple parsing)
   */
  loadEnv(envFile) {
    const envPath = path.join(this.rootDir, envFile);
    if (!fs.existsSync(envPath)) {
      return {};
    }

    const content = fs.readFileSync(envPath, 'utf8');
    const variables = {};
    
    content.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#') && line.includes('=')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          variables[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    
    return variables;
  }

  /**
   * Save environment variables to file
   */
  saveEnv(envFile, variables) {
    const envPath = path.join(this.rootDir, envFile);
    const content = Object.entries(variables)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    fs.writeFileSync(envPath, content);
    console.log(`✅ Environment saved to ${envFile}`);
  }

  /**
   * Generate environment files for all services
   */
  generateServiceEnvs() {
    this.services.forEach(service => {
      const serviceDir = path.join(this.rootDir, service);
      if (fs.existsSync(serviceDir)) {
        this.generateServiceEnv(service);
      }
    });
  }

  /**
   * Generate environment file for a specific service
   */
  generateServiceEnv(serviceName) {
    const serviceDir = path.join(this.rootDir, serviceName);
    const envPath = path.join(serviceDir, '.env.example');
    
    let envContent = '';
    
    switch (serviceName) {
      case 'sonet-client':
        envContent = this.generateClientEnv();
        break;
      case 'gateway':
        envContent = this.generateGatewayEnv();
        break;
      case 'sonet':
        envContent = this.generateSonetEnv();
        break;
    }
    
    if (envContent) {
      fs.writeFileSync(envPath, envContent);
      console.log(`✅ Generated ${serviceName}/.env.example`);
    }
  }

  /**
   * Generate client environment configuration
   */
  generateClientEnv() {
    return `# Sonet Client Environment Configuration
# Copy this to .env and fill in your values

# Expo Public Variables (Client-side accessible)
EXPO_PUBLIC_ENV=development
EXPO_PUBLIC_RELEASE_VERSION=1.0.0
EXPO_PUBLIC_BUNDLE_IDENTIFIER=dev
EXPO_PUBLIC_BUNDLE_DATE=20250101
EXPO_PUBLIC_LOG_LEVEL=info
EXPO_PUBLIC_LOG_DEBUG=

# Sonet API Configuration
EXPO_PUBLIC_SONET_API_BASE=http://localhost:8080/api
EXPO_PUBLIC_SONET_WS_BASE=ws://localhost:8080
EXPO_PUBLIC_SONET_CDN_BASE=http://localhost:8080/cdn

# External Services
EXPO_PUBLIC_SENTRY_DSN=
EXPO_PUBLIC_BITDRIFT_API_KEY=
EXPO_PUBLIC_GCP_PROJECT_ID=0

# Feature Flags
EXPO_PUBLIC_USE_SONET_MESSAGING=true
EXPO_PUBLIC_USE_SONET_E2E_ENCRYPTION=true
EXPO_PUBLIC_USE_SONET_REALTIME=true
EXPO_PUBLIC_USE_SONET_ANALYTICS=true
EXPO_PUBLIC_USE_SONET_MODERATION=true`;
  }

  /**
   * Generate gateway environment configuration
   */
  generateGatewayEnv() {
    return `# Sonet Gateway Environment Configuration
# Copy this to .env and fill in your values

# Server Configuration
GATEWAY_PORT=8080
GATEWAY_HOST=0.0.0.0
GATEWAY_CORS_ORIGIN=http://localhost:3000,http://localhost:19006

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,video/mp4,video/webm

# Service Endpoints
USER_GRPC_ADDR=user-service:9090
NOTE_GRPC_ADDR=note-service:9090
TIMELINE_GRPC_ADDR=timeline-service:50051
MEDIA_GRPC_ADDR=media-service:9090
FOLLOW_GRPC_ADDR=follow-service:9090
SEARCH_GRPC_ADDR=search-service:9096
NOTIFICATION_GRPC_ADDR=notification-service:9097`;
  }

  /**
   * Generate Sonet service environment configuration
   */
  generateSonetEnv() {
    return `# Sonet Services Environment Configuration
# Copy this to .env and fill in your values

# Database Configuration
postgres_host=localhost
postgres_port=5432
postgres_user=sonet
postgres_password=sonet_dev_password
postgres_db=sonet_dev

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Service Ports
USER_SERVICE_PORT=8081
USER_SERVICE_GRPC_PORT=9090
NOTE_SERVICE_PORT=8082
NOTE_SERVICE_GRPC_PORT=9091
MEDIA_SERVICE_PORT=8083
MEDIA_SERVICE_GRPC_PORT=9092
FOLLOW_SERVICE_PORT=8084
FOLLOW_SERVICE_GRPC_PORT=9093
NOTIFICATION_SERVICE_PORT=8085
NOTIFICATION_SERVICE_GRPC_PORT=9094
MESSAGING_SERVICE_PORT=8086
MESSAGING_SERVICE_GRPC_PORT=9095
TIMELINE_SERVICE_PORT=8087
TIMELINE_SERVICE_GRPC_PORT=50051
SEARCH_SERVICE_PORT=8088
SEARCH_SERVICE_GRPC_PORT=9096
ANALYTICS_SERVICE_PORT=8089
ANALYTICS_SERVICE_GRPC_PORT=9097

# Logging
LOG_LEVEL=debug
SERVICE_NAME=sonet-service`;
  }

  /**
   * Show current environment status
   */
  showStatus() {
    console.log('\n🔍 Environment Configuration Status\n');
    
    this.services.forEach(service => {
      const serviceDir = path.join(this.rootDir, service);
      const envFile = path.join(serviceDir, '.env');
      const envExample = path.join(serviceDir, '.env.example');
      
      console.log(`${service}:`);
      console.log(`  .env: ${fs.existsSync(envFile) ? '✅' : '❌'}`);
      console.log(`  .env.example: ${fs.existsSync(envExample) ? '✅' : '❌'}`);
    });
    
    const rootEnv = path.join(this.rootDir, '.env');
    console.log(`\nRoot .env: ${fs.existsSync(rootEnv) ? '✅' : '❌'}`);
  }

  /**
   * Run environment setup
   */
  async setup() {
    console.log('🚀 Setting up Sonet Environment Configuration...\n');
    
    // Generate service environment files
    this.generateServiceEnvs();
    
    // Show status
    this.showStatus();
    
    console.log('\n🎉 Environment setup complete!');
    console.log('\n📝 Next steps:');
    console.log('  1. Copy .env.example to .env');
    console.log('  2. Fill in your configuration values');
    console.log('  3. Copy service .env.example files to .env');
    console.log('  4. Run: npm run dev');
  }
}

// CLI interface
if (require.main === module) {
  const manager = new EnvironmentManager();
  const command = process.argv[2] || 'setup';
  
  switch (command) {
    case 'setup':
      manager.setup();
      break;
    case 'status':
      manager.showStatus();
      break;
    case 'generate':
      manager.generateServiceEnvs();
      break;
    default:
      console.log('Usage: node env-manager-simple.js [setup|status|generate]');
  }
}

module.exports = EnvironmentManager;