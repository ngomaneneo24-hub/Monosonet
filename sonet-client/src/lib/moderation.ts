import React from 'react'
import {
  type AppBskyLabelerDefs,
  BskyAgent,
  type ComAtprotoLabelDefs,
  type InterpretedLabelValueDefinition,
  LABELS,
  type ModerationCause,
  type ModerationOpts,
  type ModerationUI,
} from '@atproto/api'

import {sanitizeDisplayName} from '#/lib/strings/display-names'
import {sanitizeHandle} from '#/lib/strings/handles'
import {type AppModerationCause} from '#/components/Pills'
import type {ModerationDecision} from '#/state/preferences/moderation-opts'

// =============================================================================
// MODERATION UTILITIES
// =============================================================================

export interface ProfileView {
  did: string
  handle: string
  displayName?: string
  description?: string
  avatar?: string
  banner?: string
  labels?: Array<{
    val: string
    uri: string
    cid: string
    neg?: boolean
  }>
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
): ModerationDecision | null {
  if (!profile || !moderationOpts) return null

  // Basic moderation logic - can be enhanced based on your needs
  const decision: ModerationDecision = {
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
      ? cause.source.did
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
  label: ComAtprotoLabelDefs.Label,
): boolean {
  return ['!hide', '!takedown'].includes(label.val)
}

export function getLabelingServiceTitle({
  displayName,
  handle,
}: {
  displayName?: string
  handle: string
}) {
  return displayName
    ? sanitizeDisplayName(displayName)
    : sanitizeHandle(handle, '@')
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
    | AppBskyLabelerDefs.LabelerView
    | AppBskyLabelerDefs.LabelerViewDetailed,
): boolean {
  if (typeof labeler === 'string') {
    return BskyAgent.appLabelers.includes(labeler)
  }
  return BskyAgent.appLabelers.includes(labeler.creator.did)
}

export function isLabelerSubscribed(
  labeler:
    | string
    | AppBskyLabelerDefs.LabelerView
    | AppBskyLabelerDefs.LabelerViewDetailed,
  modOpts: ModerationOpts,
) {
  labeler = typeof labeler === 'string' ? labeler : labeler.creator.did
  if (isAppLabeler(labeler)) {
    return true
  }
  return modOpts.prefs.labelers.find(l => l.did === labeler)
}

export type Subject =
  | {
      uri: string
      cid: string
    }
  | {
      did: string
    }

export function useLabelSubject({label}: {label: ComAtprotoLabelDefs.Label}): {
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
          did: uri,
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
