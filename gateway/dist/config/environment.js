// Sonet Gateway Environment Configuration
// Unified with monorepo environment management
import dotenv from 'dotenv';
import path from 'path';
// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
/**
 * Server Configuration
 */
export const SERVER_CONFIG = {
    port: parseInt(process.env.GATEWAY_PORT || '8080', 10),
    host: process.env.GATEWAY_HOST || '0.0.0.0',
    corsOrigin: process.env.GATEWAY_CORS_ORIGIN?.split(',') || [
        'http://localhost:3000',
        'http://localhost:19006'
    ],
};
/**
 * JWT Configuration
 */
export const JWT_CONFIG = {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
};
// Validate required environment variables
if (!JWT_CONFIG.secret) {
    throw new Error('JWT_SECRET environment variable is required');
}
/**
 * Rate Limiting Configuration
 */
export const RATE_LIMIT_CONFIG = {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
};
/**
 * File Upload Configuration
 */
export const FILE_UPLOAD_CONFIG = {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
    allowedFileTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || [
        'image/jpeg',
        'image/png',
        'image/gif',
        'video/mp4',
        'video/webm'
    ],
};
/**
 * Service Endpoints Configuration
 */
export const SERVICE_ENDPOINTS = {
    userService: process.env.USER_GRPC_ADDR || 'user-service:9090',
    noteService: process.env.NOTE_GRPC_ADDR || 'note-service:9090',
    timelineService: process.env.TIMELINE_GRPC_ADDR || 'timeline-service:50051',
    mediaService: process.env.MEDIA_GRPC_ADDR || 'media-service:9090',
    followService: process.env.FOLLOW_GRPC_ADDR || 'follow-service:9090',
    searchService: process.env.SEARCH_GRPC_ADDR || 'search-service:9096',
    notificationService: process.env.NOTIFICATION_GRPC_ADDR || 'notification-service:9097',
    messagingService: process.env.MESSAGING_GRPC_ADDR || 'messaging-service:9095',
    analyticsService: process.env.ANALYTICS_GRPC_ADDR || 'analytics-service:9097',
};
/**
 * Database Configuration
 */
export const DATABASE_CONFIG = {
    postgres: {
        host: process.env.postgres_host || 'localhost',
        port: parseInt(process.env.postgres_port || '5432', 10),
        user: process.env.postgres_user || 'sonet',
        password: process.env.postgres_password || 'sonet_dev_password',
        database: process.env.postgres_db || 'sonet_dev',
        sslMode: process.env.postgres_ssl_mode || 'disable',
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || '',
        database: parseInt(process.env.REDIS_DB || '0', 10),
        url: process.env.REDIS_URL || 'redis://localhost:6379',
    },
};
/**
 * External Services Configuration
 */
export const EXTERNAL_SERVICES = {
    email: {
        smtp: {
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            user: process.env.SMTP_USER || '',
            pass: process.env.SMTP_PASS || '',
            from: process.env.SMTP_FROM || 'noreply@sonet.app',
        },
    },
    pushNotifications: {
        firebase: {
            projectId: process.env.FIREBASE_PROJECT_ID || '',
            privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID || '',
            privateKey: process.env.FIREBASE_PRIVATE_KEY || '',
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
            clientId: process.env.FIREBASE_CLIENT_ID || '',
        },
    },
    cdn: {
        provider: process.env.CDN_PROVIDER || 'local',
        baseUrl: process.env.CDN_BASE_URL || 'http://localhost:8080/cdn',
        region: process.env.CDN_REGION || 'us-east-1',
        accessKeyId: process.env.CDN_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.CDN_SECRET_ACCESS_KEY || '',
        bucketName: process.env.CDN_BUCKET_NAME || 'sonet-media',
    },
};
/**
 * Monitoring & Analytics Configuration
 */
export const MONITORING_CONFIG = {
    sentry: {
        dsn: process.env.SENTRY_DSN || '',
        org: process.env.SENTRY_ORG || 'sonet',
        project: process.env.SENTRY_PROJECT || 'sonet-app',
        authToken: process.env.SENTRY_AUTH_TOKEN || '',
    },
    logging: {
        level: process.env.LOG_LEVEL || 'debug',
        format: process.env.LOG_FORMAT || 'json',
        destination: process.env.LOG_DESTINATION || 'console',
    },
};
/**
 * Security Configuration
 */
export const SECURITY_CONFIG = {
    encryption: {
        algorithm: process.env.ENCRYPTION_ALGORITHM || 'AES-256-GCM',
        keySize: parseInt(process.env.ENCRYPTION_KEY_SIZE || '32', 10),
        ivSize: parseInt(process.env.ENCRYPTION_IV_SIZE || '12', 10),
    },
    moderation: {
        apiKey: process.env.MODERATION_API_KEY || '',
        endpoint: process.env.MODERATION_ENDPOINT || '',
        threshold: parseFloat(process.env.MODERATION_THRESHOLD || '0.8'),
    },
};
/**
 * Environment-specific configurations
 */
export const ENVIRONMENT_CONFIG = {
    development: {
        logLevel: 'debug',
        enableRateLimiting: false,
        enableSecurityHeaders: true,
        enableCaching: false,
        enableCompression: false,
    },
    staging: {
        logLevel: 'info',
        enableRateLimiting: true,
        enableSecurityHeaders: true,
        enableCaching: true,
        enableCompression: true,
    },
    production: {
        logLevel: 'warn',
        enableRateLimiting: true,
        enableSecurityHeaders: true,
        enableCaching: true,
        enableCompression: true,
    },
};
/**
 * Get current environment configuration
 */
export const getCurrentEnvConfig = () => {
    const env = process.env.NODE_ENV || 'development';
    return ENVIRONMENT_CONFIG[env] || ENVIRONMENT_CONFIG.development;
};
/**
 * Validate environment configuration
 */
export const validateEnvironment = () => {
    const required = [
        'JWT_SECRET',
        'postgres_password',
    ];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        console.warn(`⚠️ Missing required environment variables: ${missing.join(', ')}`);
        return false;
    }
    // Validate JWT secret in production
    if (process.env.NODE_ENV === 'production' && JWT_CONFIG.secret === 'dev_jwt_secret_key_change_in_production') {
        console.error('❌ JWT_SECRET must be changed in production');
        return false;
    }
    return true;
};
/**
 * Get all configuration
 */
export const getConfig = () => ({
    server: SERVER_CONFIG,
    jwt: JWT_CONFIG,
    rateLimit: RATE_LIMIT_CONFIG,
    fileUpload: FILE_UPLOAD_CONFIG,
    serviceEndpoints: SERVICE_ENDPOINTS,
    database: DATABASE_CONFIG,
    externalServices: EXTERNAL_SERVICES,
    monitoring: MONITORING_CONFIG,
    security: SECURITY_CONFIG,
    environment: getCurrentEnvConfig(),
});
export default getConfig;
