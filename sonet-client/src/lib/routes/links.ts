import {isInvalidUsername} from '#/lib/strings/usernames'

export function makeProfileLink(
  info: {
    id: string
    username: string
  },
  ...segments: string[]
) {
  let usernameSegment = info.id
  if (info.username && !isInvalidUsername(info.username)) {
    usernameSegment = info.username
  }
  return [`/profile`, usernameSegment, ...segments].join('/')
}

export function makeCustomFeedLink(
  userId: string,
  feedId: string,
  segment?: string | undefined,
  feedCacheKey?: 'discover' | 'explore' | undefined,
) {
  return (
    [`/profile`, userId, 'feed', feedId, ...(segment ? [segment] : [])].join('/') +
    (feedCacheKey ? `?feedCacheKey=${encodeURIComponent(feedCacheKey)}` : '')
  )
}

export function makeListLink(userId: string, listId: string, ...segments: string[]) {
  return [`/profile`, userId, 'lists', listId, ...segments].join('/')
}

export function makeTagLink(tag: string) {
  return `/search?q=${encodeURIComponent(tag)}`
}

export function makeSearchLink(props: {query: string; from?: 'me' | string}) {
  return `/search?q=${encodeURIComponent(
    props.query + (props.from ? ` from:${props.from}` : ''),
  )}`
}

export function makeStarterPackLink(
  starterPackOrName: any | string,
  id?: string,
) {
  if (typeof starterPackOrName === 'string') {
    return `https://sonet.app/start/${starterPackOrName}/${id}`
  } else {
    // Simplified for Sonet - extract ID from URI or use creator username
    const packId = id || 'default'
    const creatorUsername = starterPackOrName.creator?.username || 'unknown'
    return `https://sonet.app/start/${creatorUsername}/${packId}`
  }
}
