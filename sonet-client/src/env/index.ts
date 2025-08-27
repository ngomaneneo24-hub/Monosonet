// Fallback type-only import to avoid requiring the module at typecheck time
import type {ApplicationReleaseType} from 'expo-application'

import {BUNDLE_IDENTIFIER, IS_TESTFLIGHT, RELEASE_VERSION} from '#/env/common'

export * from '#/env/common'

/**
 * Sonet messaging configuration (AT Protocol deprecated)
 */
export const USE_SONET_MESSAGING = true // AT Protocol removed
export const USE_SONET_E2E_ENCRYPTION = true // E2E encryption enabled by default
export const USE_SONET_REALTIME = true // Real-time messaging enabled by default

/**
 * The semver version of the app, specified in our `package.json`.file. On
 * iOs/Android, the native build version is appended to the semver version, so
 * that it can be used to identify a specific build.
 */
export const APP_VERSION = `${RELEASE_VERSION}.${(globalThis as any).nativeBuildVersion ?? '0'}`

/**
 * The short commit hash and environment of the current bundle.
 */
export const APP_METADATA = `${BUNDLE_IDENTIFIER.slice(0, 7)} (${
  ((globalThis as any).__DEV__ ? 'dev' : IS_TESTFLIGHT ? 'tf' : 'prod')
})`
