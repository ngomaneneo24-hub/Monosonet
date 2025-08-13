import {useEffect, useId, useState} from 'react'
import {type SonetFeedDefs, AtUri} from '@sonet/api'

import {Logger} from '#/logger'
import {type FeedDescriptor} from '#/state/queries/note-feed'

/**
 * Separate logger for better debugging
 */
const logger = Logger.create(Logger.Context.NoteSource)

export type NoteSource = {
  note: SonetFeedDefs.FeedViewNote
  feed?: FeedDescriptor
}

/**
 * A cache of sources that will be consumed by the note thread view. This is
 * cleaned up any time a source is consumed.
 */
const transientSources = new Map<string, NoteSource>()

/**
 * A cache of sources that have been consumed by the note thread view. This is
 * not cleaned up, but because we use a new ID for each note thread view that
 * consumes a source, this is never reused unless a user navigates back to a
 * note thread view that has not been dropped from memory.
 */
const consumedSources = new Map<string, NoteSource>()

/**
 * For stashing the feed that the user was browsing when they clicked on a note.
 *
 * Used for FeedFeedback and other ephemeral non-critical systems.
 */
export function setUnstableNoteSource(key: string, source: NoteSource) {
  assertValidDevOnly(
    key,
    `setUnstableNoteSource key should be a URI containing a username, received ${key} — use buildNoteSourceKey`,
  )
  logger.debug('set', {key, source})
  transientSources.set(key, source)
}

/**
 * This hook is unstable and should only be used for FeedFeedback and other
 * ephemeral non-critical systems. Views that use this hook will continue to
 * return a reference to the same source until those views are dropped from
 * memory.
 */
export function useUnstableNoteSource(key: string) {
  const id = useId()
  const [source] = useState(() => {
    assertValidDevOnly(
      key,
      `consumeUnstableNoteSource key should be a URI containing a username, received ${key} — be sure to use buildNoteSourceKey when setting the source`,
      true,
    )
    const source = consumedSources.get(id) || transientSources.get(key)
    if (source) {
      logger.debug('consume', {id, key, source})
      transientSources.delete(key)
      consumedSources.set(id, source)
    }
    return source
  })

  useEffect(() => {
    return () => {
      consumedSources.delete(id)
      logger.debug('cleanup', {id})
    }
  }, [id])

  return source
}

/**
 * Builds a note source key. This (atm) is a URI where the `host` is the note
 * author's username, not UserID.
 */
export function buildNoteSourceKey(key: string, username: string) {
  const urip = new AtUri(key)
  urip.host = username
  return urip.toString()
}

/**
 * Just a lil dev helper
 */
function assertValidDevOnly(key: string, message: string, beChill = false) {
  if (__DEV__) {
    const urip = new AtUri(key)
    if (urip.host.startsWith('userId:')) {
      if (beChill) {
        logger.warn(message)
      } else {
        throw new Error(message)
      }
    }
  }
}
