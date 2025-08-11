// =============================================================================
// SONET CONVERSATION STATE MANAGEMENT
// =============================================================================

// Main provider and hooks
export {SonetConvoProvider, useSonetConvo, useSonetConvoState, useSonetConvoDispatch, useSonetConvoActions} from './convo'

// Reducer and utilities
export {sonetConvoReducer, initialSonetConvoState} from './reducer'

// Types
export type {
  // State types
  SonetConvoState,
  
  // Action types
  SonetConvoActionTypes,
  SonetConvoAction,
  
  // API types
  SonetSendMessageParams,
  SonetGetMessagesParams,
  SonetLoadMessagesParams,
  SonetLoadMoreMessagesParams,
  
  // Context types
  SonetConvoContextValue,
  SonetConvoProviderProps,
  
  // Constants
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE,
  TYPING_TIMEOUT,
  STALE_THRESHOLD,
  RETRY_DELAY,
  MAX_RETRIES
} from './types'

// Utility functions
export {
  isStale,
  shouldRefresh,
  canLoadMore,
  getTypingUsers,
  getUnreadMessages
} from './reducer'