// Sonet messaging event types - no more AT Protocol polling

export type MessagesEventBusParams = {
  // No agent needed - uses WebSocket directly
}

export enum MessagesEventBusStatus {
  Initializing = 'initializing',
  Ready = 'ready',
  Error = 'error',
  Backgrounded = 'backgrounded',
  Suspended = 'suspended',
}

export enum MessagesEventBusDispatchEvent {
  Ready = 'ready',
  Error = 'error',
  Background = 'background',
  Suspend = 'suspend',
  Resume = 'resume',
}

export enum MessagesEventBusErrorCode {
  Unknown = 'unknown',
  ConnectionFailed = 'connectionFailed',
  AuthFailed = 'authFailed',
}

export type MessagesEventBusError = {
  code: MessagesEventBusErrorCode
  exception?: Error
  retry: () => void
}

export type MessagesEventBusDispatch =
  | {
      event: MessagesEventBusDispatchEvent.Ready
    }
  | {
      event: MessagesEventBusDispatchEvent.Background
    }
  | {
      event: MessagesEventBusDispatchEvent.Suspend
    }
  | {
      event: MessagesEventBusDispatchEvent.Resume
    }
  | {
      event: MessagesEventBusDispatchEvent.Error
      payload: MessagesEventBusError
    }

export type MessagesEventBusEvent =
  | {
      type: 'connect'
    }
  | {
      type: 'disconnect'
    }
  | {
      type: 'error'
      error: MessagesEventBusError
    }
