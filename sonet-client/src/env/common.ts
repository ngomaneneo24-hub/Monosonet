// Sonet Client Environment Configuration
// Unified with monorepo environment management

import packageJson from '#/../package.json'

/**
 * The semver version of the app, as defined in `package.json.`
 *
 * N.B. The fallback is needed for Render.com deployments
 */
export const RELEASE_VERSION: string =
  process.env.EXPO_PUBLIC_RELEASE_VERSION || packageJson.version

/**
 * The env the app is running in e.g. development, testflight, production
 */
export const ENV: string = process.env.EXPO_PUBLIC_ENV || 'development'

/**
 * Indicates whether the app is running in TestFlight
 */
export const IS_TESTFLIGHT = ENV === 'testflight'

/**
 * Indicates whether the app is __DEV__
 */
export const IS_DEV = __DEV__

/**
 * Indicates whether the app is __DEV__ or TestFlight
 */
export const IS_INTERNAL = IS_DEV || IS_TESTFLIGHT

/**
 * The commit hash that the current bundle was made from. The user can
 * see the commit hash in the app's settings along with the other version info.
 * Useful for debugging/reporting.
 */
export const BUNDLE_IDENTIFIER: string =
  process.env.EXPO_PUBLIC_BUNDLE_IDENTIFIER || 'dev'

/**
 * This will always be in the format of YYMMDDHH, so that it always increases
 * for each build. This should only be used for StatSig reporting and shouldn't
 * be used to identify a specific bundle.
 */
export const BUNDLE_DATE: number =
  process.env.EXPO_PUBLIC_BUNDLE_DATE === undefined
    ? 0
    : Number(process.env.EXPO_PUBLIC_BUNDLE_DATE)

/**
 * The log level for the app.
 */
export const LOG_LEVEL = (process.env.EXPO_PUBLIC_LOG_LEVEL || 'info') as
  | 'debug'
  | 'info'
  | 'warn'
  | 'error'

/**
 * Enable debug logs for specific logger instances
 */
export const LOG_DEBUG: string = process.env.EXPO_PUBLIC_LOG_DEBUG || ''

/**
 * Sentry DSN for telemetry
 */
export const SENTRY_DSN: string | undefined = process.env.EXPO_PUBLIC_SENTRY_DSN

/**
 * Bitdrift API key. If undefined, Bitdrift should be disabled.
 */
export const BITDRIFT_API_KEY: string | undefined =
  process.env.EXPO_PUBLIC_BITDRIFT_API_KEY

/**
 * GCP project ID which is required for native device attestation. On web, this
 * should be unset and evaluate to 0.
 */
export const GCP_PROJECT_ID: number =
  process.env.EXPO_PUBLIC_GCP_PROJECT_ID === undefined
    ? 0
    : Number(process.env.EXPO_PUBLIC_GCP_PROJECT_ID)

/**
 * Base URL for Sonet REST gateway (e.g., http://localhost:8080/api)
 */
export const SONET_API_BASE: string =
  process.env.EXPO_PUBLIC_SONET_API_BASE || 'http://localhost:8080/api'

/**
 * Base URL for Sonet WebSocket gateway (e.g., ws://localhost:8080)
 */
export const SONET_WS_BASE: string =
  process.env.EXPO_PUBLIC_SONET_WS_BASE || 'ws://localhost:8080'

/**
 * Base URL for Sonet CDN (e.g., http://localhost:8080/cdn)
 */
export const SONET_CDN_BASE: string =
  process.env.EXPO_PUBLIC_SONET_CDN_BASE || 'http://localhost:8080/cdn'

/**
 * Feature Flags
 */
export const USE_SONET_MESSAGING: boolean =
  process.env.EXPO_PUBLIC_USE_SONET_MESSAGING === 'true'

export const USE_SONET_E2E_ENCRYPTION: boolean =
  process.env.EXPO_PUBLIC_USE_SONET_E2E_ENCRYPTION === 'true'

export const USE_SONET_REALTIME: boolean =
  process.env.EXPO_PUBLIC_USE_SONET_REALTIME === 'true'

export const USE_SONET_ANALYTICS: boolean =
  process.env.EXPO_PUBLIC_USE_SONET_ANALYTICS === 'true'

export const USE_SONET_MODERATION: boolean =
  process.env.EXPO_PUBLIC_USE_SONET_MODERATION === 'true'

/**
 * Environment-specific configurations
 */
export const ENVIRONMENT_CONFIG = {
  development: {
    apiBase: 'http://localhost:8080/api',
    wsBase: 'ws://localhost:8080',
    cdnBase: 'http://localhost:8080/cdn',
    logLevel: 'debug',
    enableAnalytics: false,
    enableModeration: true,
  },
  staging: {
    apiBase: 'https://staging.api.sonet.app',
    wsBase: 'wss://staging.api.sonet.app',
    cdnBase: 'https://staging.cdn.sonet.app',
    logLevel: 'info',
    enableAnalytics: true,
    enableModeration: true,
  },
  production: {
    apiBase: 'https://api.sonet.app',
    wsBase: 'wss://api.sonet.app',
    cdnBase: 'https://cdn.sonet.app',
    logLevel: 'warn',
    enableAnalytics: true,
    enableModeration: true,
  },
} as const

/**
 * Get current environment configuration
 */
export const getCurrentEnvConfig = () => {
  const env = ENV || 'development'
  return ENVIRONMENT_CONFIG[env as keyof typeof ENVIRONMENT_CONFIG] || ENVIRONMENT_CONFIG.development
}

/**
 * Validate environment configuration
 */
export const validateEnvironment = (): boolean => {
  const required = [
    'EXPO_PUBLIC_SONET_API_BASE',
    'EXPO_PUBLIC_SONET_WS_BASE',
    'EXPO_PUBLIC_SONET_CDN_BASE',
  ]

  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    console.warn(`⚠️ Missing environment variables: ${missing.join(', ')}`)
    return false
  }

  return true
}
