import {jwtDecode} from 'jwt-decode'

import {hasProp} from '#/lib/type-guards'
import {logger} from '#/logger'
import * as persisted from '#/state/persisted'
import {SessionAccount} from './types'

export function readLastActiveAccount() {
  const {currentAccount, accounts} = persisted.get('session')
  return accounts.find(a => a.userId === currentAccount?.userId)
}

export function isSignupQueued(accessJwt: string | undefined) {
  if (accessJwt) {
    const sessData = jwtDecode(accessJwt)
    return (
      hasProp(sessData, 'scope') &&
      sessData.scope === 'com.sonet.signupQueued'
    )
  }
  return false
}

export function isSessionExpired(account: SessionAccount) {
  try {
    if (account.accessJwt) {
      const decoded = jwtDecode(account.accessJwt)
      if (decoded.exp) {
        const userIdExpire = Date.now() >= decoded.exp * 1000
        return userIdExpire
      }
    }
  } catch (e) {
    logger.error(`session: could not decode jwt`)
  }
  return true
}
