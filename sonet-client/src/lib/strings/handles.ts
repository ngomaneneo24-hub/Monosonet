// Regex from the go implementation
// https://github.com/bluesky-social/indigo/blob/main/atproto/syntax/username.go#L10
import {forceLTR} from '#/lib/strings/bidi'

const VALIDATE_REGEX =
  /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/

export const MAX_SERVICE_HANDLE_LENGTH = 18

export function makeValidUsername(str: string): string {
  if (str.length > 20) {
    str = str.slice(0, 20)
  }
  str = str.toLowerCase()
  return str.replace(/^[^a-z0-9]+/g, '').replace(/[^a-z0-9-]/g, '')
}

export function createFullUsername(name: string, domain: string): string {
  name = (name || '').replace(/[.]+$/, '')
  domain = (domain || '').replace(/^[.]+/, '')
  return `${name}.${domain}`
}

export function isInvalidUsername(username: string): boolean {
  return username === 'username.invalid'
}

export function sanitizeUsername(username: string, prefix = ''): string {
  return isInvalidUsername(username)
    ? '⚠Invalid Username'
    : forceLTR(`${prefix}${username.toLocaleLowerCase()}`)
}

export interface IsValidUsername {
  usernameChars: boolean
  hyphenStartOrEnd: boolean
  frontLengthNotTooShort: boolean
  frontLengthNotTooLong: boolean
  totalLength: boolean
  overall: boolean
}

// More checks from https://github.com/bluesky-social/atproto/blob/main/packages/pds/src/username/index.ts#L72
export function validateServiceUsername(
  str: string,
  userDomain: string,
): IsValidUsername {
  const fullUsername = createFullUsername(str, userDomain)

  const results = {
    usernameChars:
      !str || (VALIDATE_REGEX.test(fullUsername) && !str.includes('.')),
    hyphenStartOrEnd: !str.startsWith('-') && !str.endsWith('-'),
    frontLengthNotTooShort: str.length >= 3,
    frontLengthNotTooLong: str.length <= MAX_SERVICE_HANDLE_LENGTH,
    totalLength: fullUsername.length <= 253,
  }

  return {
    ...results,
    overall: !Object.values(results).includes(false),
  }
}
