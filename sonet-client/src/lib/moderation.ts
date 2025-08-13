import React from 'react'
import {SonetUser, SonetLabel} from '@sonet/types'

import {sanitizeDisplayName} from '#/lib/strings/display-names'
import {sanitizeUsername} from '#/lib/strings/usernames'
import {SonetModerationDecision} from '@sonet/types'

// =============================================================================
// MODERATION UTILITIES
// =============================================================================

export interface ProfileView {
  id: string
  username: string
  displayName?: string
  bio?: string
  avatar?: string
  banner?: string
  labels?: SonetLabel[]
  viewer?: {
    blockedBy?: boolean
    blocking?: string
    following?: string
    followedBy?: string
  }
}

/**
 * Create a basic moderation decision for a profile
 * This replaces the AT Protocol moderateProfile function
 */
export function moderateProfile(
  profile: ProfileView | null,
  moderationOpts: any
): SonetModerationDecision | null {
  if (!profile || !moderationOpts) return null

  // Basic moderation logic - can be enhanced based on your needs
  const decision: SonetModerationDecision = {
    profile: {
      cause: null,
      filter: false,
      label: false,
      blur: false,
      alert: false,
      noOverride: false,
    },
    content: {
      cause: null,
      filter: false,
      label: false,
      blur: false,
      alert: false,
      noOverride: false,
    },
    user: {
      cause: null,
      filter: false,
      label: false,
      blur: false,
      alert: false,
      noOverride: false,
    },
  }

  // Check for labels that require moderation
  if (profile.labels) {
    for (const label of profile.labels) {
      if (label.neg) continue // Skip negative labels
      
      // Example: moderate certain label types
      if (label.val.includes('spam') || label.val.includes('bot')) {
        decision.profile.label = true
        decision.profile.blur = true
      }
    }
  }

  // Check for blocked users
  if (profile.viewer?.blockedBy) {
    decision.profile.filter = true
    decision.profile.blur = true
  }

  return decision
}

/**
 * Check if a profile is active (not blocked, etc.)
 */
export function isProfileActive(profile: ProfileView | null): boolean {
  if (!profile) return false
  
  // Check if user is blocked
  if (profile.viewer?.blockedBy) return false
  
  // Check for severe moderation labels
  if (profile.labels) {
    for (const label of profile.labels) {
      if (label.neg) continue
      if (label.val.includes('suspended') || label.val.includes('banned')) {
        return false
      }
    }
  }
  
  return true
}

/**
 * Get moderation cause for display
 */
export function getModerationCause(decision: ModerationDecision | null): string | null {
  if (!decision) return null
  
  if (decision.profile.cause) return decision.profile.cause
  if (decision.content.cause) return decision.content.cause
  if (decision.user.cause) return decision.user.cause
  
  return null
}

export const ADULT_CONTENT_LABELS = ['sexual', 'nudity', 'porn']
export const OTHER_SELF_LABELS = ['graphic-media']
export const SELF_LABELS = [...ADULT_CONTENT_LABELS, ...OTHER_SELF_LABELS]

export type AdultSelfLabel = (typeof ADULT_CONTENT_LABELS)[number]
export type OtherSelfLabel = (typeof OTHER_SELF_LABELS)[number]
export type SelfLabel = (typeof SELF_LABELS)[number]

export function getModerationCauseKey(
  cause: ModerationCause | AppModerationCause,
): string {
  const source =
    cause.source.type === 'labeler'
      ? cause.source.userId
      : cause.source.type === 'list'
        ? cause.source.list.uri
        : 'user'
  if (cause.type === 'label') {
    return `label:${cause.label.val}:${source}`
  }
  return `${cause.type}:${source}`
}

export function isJustAMute(modui: ModerationUI): boolean {
  return modui.filters.length === 1 && modui.filters[0].type === 'muted'
}

export function moduiContainsHideableOffense(modui: ModerationUI): boolean {
  const label = modui.filters.at(0)
  if (label && label.type === 'label') {
    return labelIsHideableOffense(label.label)
  }
  return false
}

export function labelIsHideableOffense(
  label: SonetLabelDefs.Label,
): boolean {
  return ['!hide', '!takedown'].includes(label.val)
}

export function getLabelingServiceTitle({
  displayName,
  username,
}: {
  displayName?: string
  username: string
}) {
  return displayName
    ? sanitizeDisplayName(displayName)
    : sanitizeUsername(username, '@')
}

export function lookupLabelValueDefinition(
  labelValue: string,
  customDefs: InterpretedLabelValueDefinition[] | undefined,
): InterpretedLabelValueDefinition | undefined {
  let def
  if (!labelValue.startsWith('!') && customDefs) {
    def = customDefs.find(d => d.identifier === labelValue)
  }
  if (!def) {
    def = LABELS[labelValue as keyof typeof LABELS]
  }
  return def
}

export function isAppLabeler(
  labeler:
    | string
    | SonetLabelerDefs.LabelerView
    | SonetLabelerDefs.LabelerViewDetailed,
): boolean {
  if (typeof labeler === 'string') {
    return SonetAppAgent.appLabelers.includes(labeler)
  }
  return SonetAppAgent.appLabelers.includes(labeler.creator.userId)
}

export function isLabelerSubscribed(
  labeler:
    | string
    | SonetLabelerDefs.LabelerView
    | SonetLabelerDefs.LabelerViewDetailed,
  modOpts: ModerationOpts,
) {
  labeler = typeof labeler === 'string' ? labeler : labeler.creator.userId
  if (isAppLabeler(labeler)) {
    return true
  }
  return modOpts.prefs.labelers.find(l => l.userId === labeler)
}

export type Subject =
  | {
      uri: string
      cid: string
    }
  | {
      userId: string
    }

export function useLabelSubject({label}: {label: SonetLabelDefs.Label}): {
  subject: Subject
} {
  return React.useMemo(() => {
    const {cid, uri} = label
    if (cid) {
      return {
        subject: {
          uri,
          cid,
        },
      }
    } else {
      return {
        subject: {
          userId: uri,
        },
      }
    }
  }, [label])
}

export function unique(
  value: ModerationCause,
  index: number,
  array: ModerationCause[],
) {
  return (
    array.findIndex(
      item => getModerationCauseKey(item) === getModerationCauseKey(value),
    ) === index
  )
}
