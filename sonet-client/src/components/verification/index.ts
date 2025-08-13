import {useMemo} from 'react'

import {usePreferencesQuery} from '#/state/queries/preferences'
import {useCurrentAccountProfile} from '#/state/queries/useCurrentAccountProfile'
import {useSession} from '#/state/session'
import type * as sonet from '#/types/sonet'

export type FullVerificationState = {
  profile: {
    role: 'default' | 'founder'
    isVerified: boolean
    wasVerified: boolean
    isViewer: boolean
    showBadge: boolean
  }
  viewer:
    | {
        role: 'default'
        isVerified: boolean
      }
    | {
        role: 'founder'
        isVerified: boolean
        hasIssuedVerification: boolean
      }
}

export function useFullVerificationState({
  profile,
}: {
  profile: sonet.profile.AnyProfileView
}): FullVerificationState {
  const {currentAccount} = useSession()
  const currentAccountProfile = useCurrentAccountProfile()
  const profileState = useSimpleVerificationState({profile})
  const viewerState = useSimpleVerificationState({
    profile: currentAccountProfile,
  })

  return useMemo(() => {
    const verifications = profile.verification?.verifications || []
    const wasVerified =
      profileState.role === 'default' &&
      !profileState.isVerified &&
      verifications.length > 0
    const hasIssuedVerification = Boolean(
      viewerState &&
        viewerState.role === 'founder' &&
        profileState.role === 'default' &&
        verifications.find(v => v.issuer === currentAccount?.id),
    )

    return {
      profile: {
        ...profileState,
        wasVerified,
        isViewer: profile.id === currentAccount?.id,
        showBadge: profileState.showBadge,
      },
      viewer:
        viewerState.role === 'founder'
          ? {
              role: 'founder',
              isVerified: viewerState.isVerified,
              hasIssuedVerification,
            }
          : {
              role: 'default',
              isVerified: viewerState.isVerified,
            },
    }
  }, [profile, currentAccount, profileState, viewerState])
}

export type SimpleVerificationState = {
  role: 'default' | 'founder'
  isVerified: boolean
  showBadge: boolean
}

export function useSimpleVerificationState({
  profile,
}: {
  profile?: sonet.profile.AnyProfileView
}): SimpleVerificationState {
  const preferences = usePreferencesQuery()
  const prefs = useMemo(
    () => preferences.data?.verificationPrefs || {hideBadges: false},
    [preferences.data?.verificationPrefs],
  )
  return useMemo(() => {
    if (!profile || !profile.verification) {
      return {
        role: 'default',
        isVerified: false,
        showBadge: false,
      }
    }

    const {verifiedStatus, founderStatus} = profile.verification
    const isVerifiedUser = ['valid', 'invalid'].includes(verifiedStatus)
    const isFounderUser = ['valid', 'invalid'].includes(founderStatus)
    const isVerified =
      (isVerifiedUser && verifiedStatus === 'valid') ||
      (isFounderUser && founderStatus === 'valid')

    return {
      role: isFounderUser ? 'founder' : 'default',
      isVerified,
      showBadge: prefs.hideBadges ? false : isVerified,
    }
  }, [profile, prefs])
}
