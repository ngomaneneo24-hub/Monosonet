import {
  type SonetFeedDefs,
  SonetFeedLike,
  SonetFeedNote,
  SonetFeedRenote,
  type SonetGraphDefs,
  SonetGraphStarterpack,
  type SonetNotificationListNotifications,
  type SonetAppAgent,
  hasMutedWord,
  moderateNotification,
  type ModerationOpts,
} from '@sonet/api'
import {type QueryClient} from '@tanstack/react-query'
import chunk from 'lodash.chunk'

import {labelIsHideableOffense} from '#/lib/moderation'
import * as bsky from '#/types/bsky'
import {precacheProfile} from '../profile'
import {
  type FeedNotification,
  type FeedPage,
  type NotificationType,
} from './types'

const GROUPABLE_REASONS = [
  'like',
  'renote',
  'follow',
  'like-via-renote',
  'renote-via-renote',
  'subscribed-note',
]
const MS_1HR = 1e3 * 60 * 60
const MS_2DAY = MS_1HR * 48

// exported api
// =

export async function fetchPage({
  agent,
  cursor,
  limit,
  queryClient,
  moderationOpts,
  fetchAdditionalData,
  reasons,
}: {
  agent: SonetAppAgent
  cursor: string | undefined
  limit: number
  queryClient: QueryClient
  moderationOpts: ModerationOpts | undefined
  fetchAdditionalData: boolean
  reasons: string[]
}): Promise<{
  page: FeedPage
  indexedAt: string | undefined
}> {
  const res = await agent.listNotifications({
    limit,
    cursor,
    reasons,
  })

  const indexedAt = res.data.notifications[0]?.indexedAt

  // filter out notifs by mod rules
  const notifs = res.data.notifications.filter(
    notif => !shouldFilterNotif(notif, moderationOpts),
  )

  // group notifications which are essentially similar (follows, likes on a note)
  let notifsGrouped = groupNotifications(notifs)

  // we fetch subjects of notifications (usually notes) now instead of lazily
  // in the UI to avoid relayouts
  if (fetchAdditionalData) {
    const subjects = await fetchSubjects(agent, notifsGrouped)
    for (const notif of notifsGrouped) {
      if (notif.subjectUri) {
        if (
          notif.type === 'starterpack-joined' &&
          notif.notification.reasonSubject
        ) {
          notif.subject = subjects.starterPacks.get(
            notif.notification.reasonSubject,
          )
        } else {
          notif.subject = subjects.notes.get(notif.subjectUri)
          if (notif.subject) {
            precacheProfile(queryClient, notif.subject.author)
          }
        }
      }
    }
  }

  let seenAt = res.data.seenAt ? new Date(res.data.seenAt) : new Date()
  if (Number.isNaN(seenAt.getTime())) {
    seenAt = new Date()
  }

  return {
    page: {
      cursor: res.data.cursor,
      seenAt,
      items: notifsGrouped,
      priority: res.data.priority ?? false,
    },
    indexedAt,
  }
}

// internal methods
// =

export function shouldFilterNotif(
  notif: SonetNotificationListNotifications.Notification,
  moderationOpts: ModerationOpts | undefined,
): boolean {
  const containsImperative = !!notif.author.labels?.some(labelIsHideableOffense)
  if (containsImperative) {
    return true
  }
  if (!moderationOpts) {
    return false
  }
  if (
    notif.reason === 'subscribed-note' &&
    bsky.dangerousIsType<SonetFeedNote.Record>(
      notif.record,
      SonetFeedNote.isRecord,
    ) &&
    hasMutedWord({
      mutedWords: moderationOpts.prefs.mutedWords,
      text: notif.record.text,
      facets: notif.record.facets,
      outlineTags: notif.record.tags,
      languages: notif.record.langs,
      actor: notif.author,
    })
  ) {
    return true
  }
  if (notif.author.viewer?.following) {
    return false
  }
  return moderateNotification(notif, moderationOpts).ui('contentList').filter
}

export function groupNotifications(
  notifs: SonetNotificationListNotifications.Notification[],
): FeedNotification[] {
  const groupedNotifs: FeedNotification[] = []
  for (const notif of notifs) {
    const ts = +new Date(notif.indexedAt)
    let grouped = false
    if (GROUPABLE_REASONS.includes(notif.reason)) {
      for (const groupedNotif of groupedNotifs) {
        const ts2 = +new Date(groupedNotif.notification.indexedAt)
        if (
          Math.abs(ts2 - ts) < MS_2DAY &&
          notif.reason === groupedNotif.notification.reason &&
          notif.reasonSubject === groupedNotif.notification.reasonSubject &&
          (notif.author.userId !== groupedNotif.notification.author.userId ||
            notif.reason === 'subscribed-note')
        ) {
          const nextIsFollowBack =
            notif.reason === 'follow' && notif.author.viewer?.following
          const prevIsFollowBack =
            groupedNotif.notification.reason === 'follow' &&
            groupedNotif.notification.author.viewer?.following
          const shouldUngroup = nextIsFollowBack || prevIsFollowBack
          if (!shouldUngroup) {
            groupedNotif.additional = groupedNotif.additional || []
            groupedNotif.additional.push(notif)
            grouped = true
            break
          }
        }
      }
    }
    if (!grouped) {
      const type = toKnownType(notif)
      if (type !== 'starterpack-joined') {
        groupedNotifs.push({
          _reactKey: `notif-${notif.uri}-${notif.reason}`,
          type,
          notification: notif,
          subjectUri: getSubjectUri(type, notif),
        })
      } else {
        groupedNotifs.push({
          _reactKey: `notif-${notif.uri}-${notif.reason}`,
          type: 'starterpack-joined',
          notification: notif,
          subjectUri: notif.uri,
        })
      }
    }
  }
  return groupedNotifs
}

async function fetchSubjects(
  agent: SonetAppAgent,
  groupedNotifs: FeedNotification[],
): Promise<{
  notes: Map<string, SonetFeedDefs.NoteView>
  starterPacks: Map<string, SonetGraphDefs.StarterPackViewBasic>
}> {
  const noteUris = new Set<string>()
  const packUris = new Set<string>()
  for (const notif of groupedNotifs) {
    if (notif.subjectUri?.includes('app.sonet.feed.note')) {
      noteUris.add(notif.subjectUri)
    } else if (
      notif.notification.reasonSubject?.includes('app.sonet.graph.starterpack')
    ) {
      packUris.add(notif.notification.reasonSubject)
    }
  }
  const noteUriChunks = chunk(Array.from(noteUris), 25)
  const packUriChunks = chunk(Array.from(packUris), 25)
  const notesChunks = await Promise.all(
    noteUriChunks.map(uris =>
      agent.app.sonet.feed.getNotes({uris}).then(res => res.data.notes),
    ),
  )
  const packsChunks = await Promise.all(
    packUriChunks.map(uris =>
      agent.app.sonet.graph
        .getStarterPacks({uris})
        .then(res => res.data.starterPacks),
    ),
  )
  const notesMap = new Map<string, SonetFeedDefs.NoteView>()
  const packsMap = new Map<string, SonetGraphDefs.StarterPackViewBasic>()
  for (const note of notesChunks.flat()) {
    if (SonetFeedNote.isRecord(note.record)) {
      notesMap.set(note.uri, note)
    }
  }
  for (const pack of packsChunks.flat()) {
    if (SonetGraphStarterpack.isRecord(pack.record)) {
      packsMap.set(pack.uri, pack)
    }
  }
  return {
    notes: notesMap,
    starterPacks: packsMap,
  }
}

function toKnownType(
  notif: SonetNotificationListNotifications.Notification,
): NotificationType {
  if (notif.reason === 'like') {
    if (notif.reasonSubject?.includes('feed.generator')) {
      return 'feedgen-like'
    }
    return 'note-like'
  }
  if (
    notif.reason === 'renote' ||
    notif.reason === 'mention' ||
    notif.reason === 'reply' ||
    notif.reason === 'quote' ||
    notif.reason === 'follow' ||
    notif.reason === 'starterpack-joined' ||
    notif.reason === 'verified' ||
    notif.reason === 'unverified' ||
    notif.reason === 'like-via-renote' ||
    notif.reason === 'renote-via-renote' ||
    notif.reason === 'subscribed-note'
  ) {
    return notif.reason as NotificationType
  }
  return 'unknown'
}

function getSubjectUri(
  type: NotificationType,
  notif: SonetNotificationListNotifications.Notification,
): string | undefined {
  if (
    type === 'reply' ||
    type === 'quote' ||
    type === 'mention' ||
    type === 'subscribed-note'
  ) {
    return notif.uri
  } else if (
    type === 'note-like' ||
    type === 'renote' ||
    type === 'like-via-renote' ||
    type === 'renote-via-renote'
  ) {
    if (
      bsky.dangerousIsType<SonetFeedRenote.Record>(
        notif.record,
        SonetFeedRenote.isRecord,
      ) ||
      bsky.dangerousIsType<SonetFeedLike.Record>(
        notif.record,
        SonetFeedLike.isRecord,
      )
    ) {
      return typeof notif.record.subject?.uri === 'string'
        ? notif.record.subject?.uri
        : undefined
    }
  } else if (type === 'feedgen-like') {
    return notif.reasonSubject
  }
}
