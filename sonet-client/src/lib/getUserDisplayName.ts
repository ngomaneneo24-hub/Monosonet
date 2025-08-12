import {sanitizeDisplayName} from '#/lib/strings/display-names'
import {sanitizeUsername} from '#/lib/strings/usernames'

export function getUserDisplayName<
  T extends {displayName?: string; username: string; [key: string]: any},
>(props: T): string {
  return sanitizeDisplayName(
    props.displayName || sanitizeUsername(props.username, '@'),
  )
}
