import {logger} from '#/logger'

export interface FlaggedAccount {
  id: string
  username: string
  reason: string
  flaggedAt: Date
  expiresAt: Date
  warningMessage: string
  isActive: boolean
}

export interface FlagAccountRequest {
  accountId: string
  reason: string
  warningMessage?: string
}

export interface FlagAccountResponse {
  success: boolean
  flaggedAccount?: FlaggedAccount
  error?: string
}

class FlaggingService {
  private flaggedAccounts: Map<string, FlaggedAccount> = new Map()

  /**
   * Flag an account for moderation review
   * This appears to come from Sonet moderation, not revealing founder identity
   */
  async flagAccount(request: FlagAccountRequest): Promise<FlagAccountResponse> {
    try {
      const now = new Date()
      const expiresAt = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000) // 60 days

      const flaggedAccount: FlaggedAccount = {
        id: request.accountId,
        username: '', // Will be populated from account lookup
        reason: request.reason,
        flaggedAt: now,
        expiresAt,
        warningMessage: request.warningMessage || this.generateDefaultWarning(request.reason),
        isActive: true,
      }

      // Store the flagged account
      this.flaggedAccounts.set(request.accountId, flaggedAccount)

      // Schedule automatic expiration
      this.scheduleExpiration(request.accountId, expiresAt)

      logger.info('Account flagged for moderation review', {
        accountId: request.accountId,
        reason: request.reason,
        expiresAt: expiresAt.toISOString(),
      })

      return {
        success: true,
        flaggedAccount,
      }
    } catch (error) {
      logger.error('Failed to flag account', {error, request})
      return {
        success: false,
        error: 'Failed to flag account',
      }
    }
  }

  /**
   * Get all flagged accounts
   */
  async getFlaggedAccounts(): Promise<FlaggedAccount[]> {
    return Array.from(this.flaggedAccounts.values()).filter(account => account.isActive)
  }

  /**
   * Remove a flag from an account
   */
  async removeFlag(accountId: string): Promise<boolean> {
    const account = this.flaggedAccounts.get(accountId)
    if (account) {
      account.isActive = false
      this.flaggedAccounts.set(accountId, account)
      logger.info('Flag removed from account', {accountId})
      return true
    }
    return false
  }

  /**
   * Check if an account is currently flagged
   */
  async isAccountFlagged(accountId: string): Promise<boolean> {
    const account = this.flaggedAccounts.get(accountId)
    return account ? account.isActive && new Date() < account.expiresAt : false
  }

  /**
   * Get flag details for an account
   */
  async getAccountFlag(accountId: string): Promise<FlaggedAccount | null> {
    const account = this.flaggedAccounts.get(accountId)
    if (account && account.isActive && new Date() < account.expiresAt) {
      return account
    }
    return null
  }

  /**
   * Generate a default warning message that appears to come from Sonet moderation
   */
  private generateDefaultWarning(reason: string): string {
    const warnings = {
      'spam': 'Your account has been flagged for potential spam activity. Please review our community guidelines.',
      'harassment': 'Your account has been flagged for potential harassment. Please review our community guidelines.',
      'inappropriate_content': 'Your account has been flagged for potentially inappropriate content. Please review our community guidelines.',
      'fake_news': 'Your account has been flagged for potentially spreading misinformation. Please review our community guidelines.',
      'bot_activity': 'Your account has been flagged for potential automated activity. Please review our community guidelines.',
      'default': 'Your account has been flagged for review by Sonet moderation. Please review our community guidelines.',
    }

    return warnings[reason as keyof typeof warnings] || warnings.default
  }

  /**
   * Schedule automatic expiration of a flag
   */
  private scheduleExpiration(accountId: string, expiresAt: Date): void {
    const now = new Date()
    const timeUntilExpiration = expiresAt.getTime() - now.getTime()

    if (timeUntilExpiration > 0) {
      setTimeout(() => {
        this.expireFlag(accountId)
      }, timeUntilExpiration)
    }
  }

  /**
   * Expire a flag automatically
   */
  private expireFlag(accountId: string): void {
    const account = this.flaggedAccounts.get(accountId)
    if (account) {
      account.isActive = false
      this.flaggedAccounts.set(accountId, account)
      logger.info('Account flag automatically expired', {accountId})
    }
  }

  /**
   * Clean up expired flags
   */
  async cleanupExpiredFlags(): Promise<void> {
    const now = new Date()
    for (const [accountId, account] of this.flaggedAccounts.entries()) {
      if (account.isActive && now >= account.expiresAt) {
        account.isActive = false
        this.flaggedAccounts.set(accountId, account)
        logger.info('Expired flag cleaned up', {accountId})
      }
    }
  }
}

export const flaggingService = new FlaggingService()