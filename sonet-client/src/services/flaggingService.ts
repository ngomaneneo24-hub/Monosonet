import {logger} from '#/logger'

export interface FlaggedAccount {
  id: string
  user_id: string
  username: string
  reason: string
  warning_message: string
  flagged_at: string
  expires_at: string
  is_active: boolean
}

export interface FlagAccountRequest {
  target_user_id: string
  target_username: string
  reason: string
  warning_message?: string
}

export interface FlagAccountResponse {
  success: boolean
  flag_id?: string
  message?: string
  expires_at?: string
  error?: string
}

export interface ModerationAction {
  type: 'flag' | 'shadowban' | 'suspend' | 'ban' | 'delete_note'
  target_user_id: string
  target_username: string
  reason: string
  warning_message?: string
  duration_days?: number
  permanent?: boolean
}

class FlaggingService {
  private baseUrl = '/api/v1/moderation'

  /**
   * Flag an account for moderation review
   * This appears to come from Sonet moderation, not revealing founder identity
   */
  async flagAccount(request: FlagAccountRequest): Promise<FlagAccountResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/accounts/flag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to flag account')
      }

      const data = await response.json()
      
      logger.info('Account flagged for moderation review', {
        target_user_id: request.target_user_id,
        reason: request.reason,
        expires_at: data.expires_at,
      })

      return {
        success: true,
        flag_id: data.flag_id,
        message: data.message,
        expires_at: data.expires_at,
      }
    } catch (error) {
      logger.error('Failed to flag account', {error, request})
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to flag account',
      }
    }
  }

  /**
   * Remove a flag from an account
   */
  async removeFlag(flagId: string): Promise<FlagAccountResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/accounts/flag/${flagId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove flag')
      }

      const data = await response.json()
      
      logger.info('Flag removed from account', {flag_id: flagId})

      return {
        success: true,
        message: data.message,
      }
    } catch (error) {
      logger.error('Failed to remove flag', {error, flag_id: flagId})
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove flag',
      }
    }
  }

  /**
   * Shadowban an account
   */
  async shadowbanAccount(request: Omit<FlagAccountRequest, 'warning_message'>): Promise<FlagAccountResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/accounts/shadowban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to shadowban account')
      }

      const data = await response.json()
      
      logger.info('Account shadowbanned', {
        target_user_id: request.target_user_id,
        reason: request.reason,
      })

      return {
        success: true,
        message: data.message,
      }
    } catch (error) {
      logger.error('Failed to shadowban account', {error, request})
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to shadowban account',
      }
    }
  }

  /**
   * Suspend an account
   */
  async suspendAccount(
    request: Omit<FlagAccountRequest, 'warning_message'> & { duration_days: number }
  ): Promise<FlagAccountResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/accounts/suspend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to suspend account')
      }

      const data = await response.json()
      
      logger.info('Account suspended', {
        target_user_id: request.target_user_id,
        reason: request.reason,
        duration_days: request.duration_days,
      })

      return {
        success: true,
        message: data.message,
      }
    } catch (error) {
      logger.error('Failed to suspend account', {error, request})
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to suspend account',
      }
    }
  }

  /**
   * Ban an account
   */
  async banAccount(
    request: Omit<FlagAccountRequest, 'warning_message'> & { permanent: boolean }
  ): Promise<FlagAccountResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/accounts/ban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to ban account')
      }

      const data = await response.json()
      
      logger.info('Account banned', {
        target_user_id: request.target_user_id,
        reason: request.reason,
        permanent: request.permanent,
      })

      return {
        success: true,
        message: data.message,
      }
    } catch (error) {
      logger.error('Failed to ban account', {error, request})
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to ban account',
      }
    }
  }

  /**
   * Delete a note (appears as Sonet moderation)
   */
  async deleteNote(
    noteId: string,
    targetUserId: string,
    reason: string
  ): Promise<FlagAccountResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/notes/${noteId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify({
          target_user_id: targetUserId,
          reason,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete note')
      }

      const data = await response.json()
      
      logger.info('Note deleted by moderation', {
        note_id: noteId,
        target_user_id: targetUserId,
        reason,
      })

      return {
        success: true,
        message: data.message,
      }
    } catch (error) {
      logger.error('Failed to delete note', {error, note_id: noteId})
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete note',
      }
    }
  }

  /**
   * Get all flagged accounts
   */
  async getFlaggedAccounts(includeExpired = false): Promise<FlaggedAccount[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/accounts/flagged?include_expired=${includeExpired}`,
        {
          headers: {
            'Authorization': `Bearer ${this.getAuthToken()}`,
          },
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get flagged accounts')
      }

      const data = await response.json()
      return data.accounts || []
    } catch (error) {
      logger.error('Failed to get flagged accounts', {error})
      return []
    }
  }

  /**
   * Get moderation statistics
   */
  async getModerationStats(periodStart?: string, periodEnd?: string): Promise<any> {
    try {
      let url = `${this.baseUrl}/stats`
      const params = new URLSearchParams()
      
      if (periodStart) params.append('period_start', periodStart)
      if (periodEnd) params.append('period_end', periodEnd)
      
      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get moderation stats')
      }

      const data = await response.json()
      return data.stats || {}
    } catch (error) {
      logger.error('Failed to get moderation stats', {error})
      return {}
    }
  }

  /**
   * Check if an account is currently flagged
   */
  async isAccountFlagged(userId: string): Promise<boolean> {
    try {
      const flaggedAccounts = await this.getFlaggedAccounts(false)
      return flaggedAccounts.some(account => 
        account.user_id === userId && account.is_active
      )
    } catch (error) {
      logger.error('Failed to check if account is flagged', {error, user_id: userId})
      return false
    }
  }

  /**
   * Get flag details for an account
   */
  async getAccountFlag(userId: string): Promise<FlaggedAccount | null> {
    try {
      const flaggedAccounts = await this.getFlaggedAccounts(false)
      const account = flaggedAccounts.find(acc => 
        acc.user_id === userId && acc.is_active
      )
      return account || null
    } catch (error) {
      logger.error('Failed to get account flag', {error, user_id: userId})
      return null
    }
  }

  /**
   * Get authentication token from storage
   */
  private getAuthToken(): string {
    // This should be implemented based on your auth system
    // For now, returning empty string - implement based on your auth token storage
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') || ''
  }
}

export const flaggingService = new FlaggingService()