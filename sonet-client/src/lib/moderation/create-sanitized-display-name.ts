import {sanitizeDisplayName} from '#/lib/strings/display-names'
import {sanitizeUsername} from '#/lib/strings/usernames'
import type * as bsky from '#/types/bsky'

export function createSanitizedDisplayName(
  profile: bsky.profile.AnyProfileView,
  noAt = false,
) {
  if (profile.displayName != null && profile.displayName !== '') {
    return sanitizeDisplayName(profile.displayName)
  } else {
    return sanitizeUsername(profile.username, noAt ? '' : '@')
  }
}
