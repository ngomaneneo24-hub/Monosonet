// Catch-all shim for deep imports from '@atproto/api/dist/*'
export * from './atproto-runtime'
export const mutewords = {
  hasMutedWord(_s: string): boolean { return false },
}