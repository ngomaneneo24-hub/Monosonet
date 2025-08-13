import {
  type SonetFeedDefs,
  type SonetGraphDefs,
  type SonetNotificationListNotifications,
} from '@sonet/api'

export type NotificationType =
  | StarterPackNotificationType
  | OtherNotificationType

export type FeedNotification =
  | (FeedNotificationBase & {
      type: StarterPackNotificationType
      subject?: SonetGraphDefs.StarterPackViewBasic
    })
  | (FeedNotificationBase & {
      type: OtherNotificationType
      subject?: SonetFeedDefs.NoteView
    })

export interface FeedPage {
  cursor: string | undefined
  seenAt: Date
  items: FeedNotification[]
  priority: boolean
}

export interface CachedFeedPage {
  /**
   * if true, the cached page is recent enough to use as the response
   */
  usableInFeed: boolean
  syncedAt: Date
  data: FeedPage | undefined
  unreadCount: number
}

type StarterPackNotificationType = 'starterpack-joined'
type OtherNotificationType =
  | 'note-like'
  | 'renote'
  | 'mention'
  | 'reply'
  | 'quote'
  | 'follow'
  | 'feedgen-like'
  | 'verified'
  | 'unverified'
  | 'like-via-renote'
  | 'renote-via-renote'
  | 'subscribed-note'
  | 'unknown'

type FeedNotificationBase = {
  _reactKey: string
  notification: SonetNotificationListNotifications.Notification
  additional?: SonetNotificationListNotifications.Notification[]
  subjectUri?: string
  subject?: SonetFeedDefs.NoteView | SonetGraphDefs.StarterPackViewBasic
}
