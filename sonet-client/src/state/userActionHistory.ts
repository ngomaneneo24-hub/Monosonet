import React from 'react'

const LIKE_WINDOW = 100
const FOLLOW_WINDOW = 100
const FOLLOW_SUGGESTION_WINDOW = 100
const SEEN_WINDOW = 100

export type SeenNote = {
  uri: string
  likeCount: number
  renoteCount: number
  replyCount: number
  isFollowedBy: boolean
  feedContext: string | undefined
}

export type UserActionHistory = {
  /**
   * The last 100 note URIs the user has liked
   */
  likes: string[]
  /**
   * The last 100 UserIDs the user has followed
   */
  follows: string[]
  /*
   * The last 100 UserIDs of suggested follows based on last follows
   */
  followSuggestions: string[]
  /**
   * The last 100 note URIs the user has seen from the Discover feed only
   */
  seen: SeenNote[]
}

const userActionHistory: UserActionHistory = {
  likes: [],
  follows: [],
  followSuggestions: [],
  seen: [],
}

export function getActionHistory() {
  return userActionHistory
}

export function useActionHistorySnapshot() {
  return React.useState(() => getActionHistory())[0]
}

export function like(noteUris: string[]) {
  userActionHistory.likes = userActionHistory.likes
    .concat(noteUris)
    .slice(-LIKE_WINDOW)
}
export function unlike(noteUris: string[]) {
  userActionHistory.likes = userActionHistory.likes.filter(
    uri => !noteUris.includes(uri),
  )
}

export function follow(userIds: string[]) {
  userActionHistory.follows = userActionHistory.follows
    .concat(userIds)
    .slice(-FOLLOW_WINDOW)
}

export function followSuggestion(userIds: string[]) {
  userActionHistory.followSuggestions = userActionHistory.followSuggestions
    .concat(userIds)
    .slice(-FOLLOW_SUGGESTION_WINDOW)
}

export function unfollow(userIds: string[]) {
  userActionHistory.follows = userActionHistory.follows.filter(
    uri => !userIds.includes(uri),
  )
}

export function seen(notes: SeenNote[]) {
  userActionHistory.seen = userActionHistory.seen
    .concat(notes)
    .slice(-SEEN_WINDOW)
}
