// Sonet API Index - Re-exports for @sonet/api compatibility

// Re-export all types and functions
export * from './sonet-api'

// Also export from the main API index
export * from './index'

// Export the SonetClient
export { SonetClient } from '../api/sonet-client'
export { SonetClient as default } from '../api/sonet-client'
export { SonetClient as sonetClient } from '../api/sonet-client'