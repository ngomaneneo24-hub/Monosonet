// Sonet Agent - Replacing AT Protocol agent

import {sonetClient, SonetClient} from '@sonet/api'
import {SonetUser, SonetAuthResponse} from '@sonet/types'

import {networkRetry} from '#/lib/async/retry'
import {logger} from '#/logger'
import {emitNetworkConfirmed, emitNetworkLost} from '../events'
import {SessionAccount} from './types'

export interface SonetSessionData {
  accessToken: string
  refreshToken: string
  user: SonetUser
  service: string
}

export interface SonetSessionEvent {
  type: 'create' | 'update' | 'expired' | 'create-failed' | 'update-failed'
  session: SonetSessionData
}

export class SonetAppAgent {
  private client: SonetClient
  private session?: SonetSessionData
  private sessionChangeCallback?: (agent: SonetAppAgent, userId: string, event: SonetSessionEvent) => void

  // Static properties for app configuration
  static appLabelers: string[] = []
  static app = {
    // Add app-specific configuration
  }

  constructor(options: {service: string}) {
    this.client = new SonetClient(options.service)
  }

  // Session management
  get sessionManager() {
    return {
      session: this.session,
      setSession: (session: SonetSessionData) => {
        this.session = session
        this.client.setAccessToken(session.accessToken)
      },
      pdsUrl: undefined, // Not needed for Sonet
    }
  }

  async login(credentials: {identifier: string; password: string; authFactorToken?: string}) {
    try {
      const response = await this.client.login(credentials.identifier, credentials.password)
      this.session = {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        user: response.user,
        service: this.client.baseUrl,
      }
      this.client.setAccessToken(response.accessToken)
      
      if (this.sessionChangeCallback) {
        this.sessionChangeCallback(this, response.user.id, {
          type: 'create',
          session: this.session,
        })
      }
      
      return response
    } catch (error) {
      logger.error('Sonet login failed', error)
      throw error
    }
  }

  async createAccount(accountData: {
    email: string
    password: string
    username: string
    inviteCode?: string
    verificationPhone?: string
    verificationCode?: string
  }) {
    try {
      const response = await this.client.register(
        accountData.username,
        accountData.email,
        accountData.password
      )
      
      this.session = {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        user: response.user,
        service: this.client.baseUrl,
      }
      this.client.setAccessToken(response.accessToken)
      
      if (this.sessionChangeCallback) {
        this.sessionChangeCallback(this, response.user.id, {
          type: 'create',
          session: this.session,
        })
      }
      
      return response
    } catch (error) {
      logger.error('Sonet account creation failed', error)
      throw error
    }
  }

  async resumeSession(sessionData: SonetSessionData) {
    try {
      this.session = sessionData
      this.client.setAccessToken(sessionData.accessToken)
      
      // Verify the session is still valid by making a test API call
      await this.client.getUser(sessionData.user.username)
      
      if (this.sessionChangeCallback) {
        this.sessionChangeCallback(this, sessionData.user.id, {
          type: 'update',
          session: this.session,
        })
      }
      
      return true
    } catch (error) {
      logger.error('Sonet session resume failed', error)
      if (this.sessionChangeCallback) {
        this.sessionChangeCallback(this, sessionData.user.id, {
          type: 'expired',
          session: sessionData,
        })
      }
      throw error
    }
  }

  async logout() {
    try {
      await this.client.logout()
    } finally {
      this.session = undefined
      this.client.setAccessToken(undefined)
    }
  }

  // Utility methods
  get session(): SonetSessionData | undefined {
    return this.session
  }

  get isAuthenticated(): boolean {
    return this.client.isAuthenticated()
  }

  // Prepare the agent with callbacks and configuration
  prepare(
    onSessionChange: (agent: SonetAppAgent, userId: string, event: SonetSessionEvent) => void
  ) {
    this.sessionChangeCallback = onSessionChange
    return this
  }

  // Expose the client for API calls
  get api() {
    return this.client
  }

  // Add missing methods that are expected by the codebase
  get com() {
    return {
      // Add com-related functionality
    }
  }

  async createModerationReport(report: any) {
    // Proxy to SonetClient which calls the gateway moderation route
    try {
      const resp = await this.client.createReport(report)
      return resp
    } catch (e) {
      throw e
    }
  }

  // Make session accessible for compatibility
  get sessionData() {
    return this.session
  }
}

// Factory functions
export function createPublicSonetAgent() {
  return new SonetAppAgent({service: 'https://api.sonet.app'})
}

export async function createSonetAgentAndResume(
  storedAccount: SessionAccount,
  onSessionChange: (
    agent: SonetAppAgent,
    userId: string,
    event: SonetSessionEvent,
  ) => void,
) {
  const agent = new SonetAppAgent({service: storedAccount.service})
  
  if (storedAccount.accessToken) {
    const sessionData: SonetSessionData = {
      accessToken: storedAccount.accessToken,
      refreshToken: storedAccount.refreshToken || '',
      user: storedAccount.user,
      service: storedAccount.service,
    }
    
    try {
      await networkRetry(1, () => agent.resumeSession(sessionData))
    } catch (e: any) {
      logger.error(`networkRetry failed to resume session`, {
        status: e?.status || 'unknown',
        safeMessage: e?.message || 'unknown',
      })
      throw e
    }
  }

  return agent.prepare(onSessionChange)
}

export async function createSonetAgentAndLogin(
  credentials: {
    service: string
    identifier: string
    password: string
    authFactorToken?: string
  },
  onSessionChange: (
    agent: SonetAppAgent,
    userId: string,
    event: SonetSessionEvent,
  ) => void,
) {
  const agent = new SonetAppAgent({service: credentials.service})
  await agent.login(credentials)
  return agent.prepare(onSessionChange)
}

export async function createSonetAgentAndCreateAccount(
  accountData: {
    service: string
    email: string
    password: string
    username: string
    birthDate: Date
    inviteCode?: string
    verificationPhone?: string
    verificationCode?: string
  },
  onSessionChange: (
    agent: SonetAppAgent,
    userId: string,
    event: SonetSessionEvent,
  ) => void,
) {
  const agent = new SonetAppAgent({service: accountData.service})
  await agent.createAccount(accountData)
  return agent.prepare(onSessionChange)
}

export function sonetAgentToSessionAccount(agent: SonetAppAgent): SessionAccount | undefined {
  if (!agent.session) {
    return undefined
  }
  
  return {
    userId: agent.session.user.id,
    username: agent.session.user.username,
    displayName: agent.session.user.displayName,
    email: '', // Not stored in Sonet session
    emailConfirmed: true, // Assume confirmed for Sonet
    accessJwt: agent.session.accessToken,
    refreshJwt: agent.session.refreshToken,
    service: agent.session.service,
    pdsUrl: undefined, // Not needed for Sonet
    accessToken: agent.session.accessToken,
    refreshToken: agent.session.refreshToken,
    user: agent.session.user,
    pdsAddressHistory: [],
    signupQueued: false,
    birthDate: undefined, // Not stored in Sonet session
  }
}

export function sonetAgentToSessionAccountOrThrow(agent: SonetAppAgent): SessionAccount {
  const account = sonetAgentToSessionAccount(agent)
  if (!account) {
    throw Error('Expected an active session')
  }
  return account
}

export function sessionAccountToSonetSession(account: SessionAccount): SonetSessionData {
  return {
    accessToken: account.accessToken || account.accessJwt,
    refreshToken: account.refreshToken || account.refreshJwt,
    user: account.user,
    service: account.service,
  }
}