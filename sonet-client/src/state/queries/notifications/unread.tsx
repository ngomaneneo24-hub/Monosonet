/**
 * A kind of companion API to ./feed.ts. See that file for more info.
 */

import React, {useRef} from 'react'
import {AppState} from 'react-native'
import {useQueryClient} from '@tanstack/react-query'
import EventEmitter from 'eventemitter3'

import BroadcastChannel from '#/lib/broadcast'
import {resetBadgeCount} from '#/lib/notifications/notifications'
import {logger} from '#/logger'
import {useAgent, useSession} from '#/state/session'
import {useSonetApi, useSonetSession} from '#/state/session/sonet'
import {useModerationOpts} from '../../preferences/moderation-opts'
import {truncateAndInvalidate} from '../util'
import {RQKEY as RQKEY_NOTIFS} from './feed'
import {type CachedFeedPage, type FeedPage} from './types'
import {fetchPage} from './util'

const UPDATE_INTERVAL = 30 * 1e3 // 30sec

const broadcast = new BroadcastChannel('NOTIFS_BROADCAST_CHANNEL')

const emitter = new EventEmitter()

type StateContext = string

interface ApiContext {
  markAllRead: () => Promise<void>
  checkUnread: (opts?: {
    invalidate?: boolean
    isPoll?: boolean
  }) => Promise<void>
  getCachedUnreadPage: () => FeedPage | undefined
}

const stateContext = React.createContext<StateContext>('')

const apiContext = React.createContext<ApiContext>({
  async markAllRead() {},
  async checkUnread() {},
  getCachedUnreadPage: () => undefined,
})

export function Provider({children}: React.PropsWithChildren<{}>) {
  const {hasSession} = useSession()
  const agent = useAgent()
  const sonet = useSonetApi()
  const sonetSession = useSonetSession()
  const queryClient = useQueryClient()
  const moderationOpts = useModerationOpts()

  const [numUnread, setNumUnread] = React.useState('')

  const checkUnreadRef = React.useRef<ApiContext['checkUnread'] | null>(null)
  const cacheRef = React.useRef<CachedFeedPage>({
    usableInFeed: false,
    syncedAt: new Date(),
    data: undefined,
    unreadCount: 0,
  })

  React.useEffect(() => {
    function markAsUnusable() {
      if (cacheRef.current) {
        cacheRef.current.usableInFeed = false
      }
    }
    emitter.addListener('invalidate', markAsUnusable)
    return () => {
      emitter.removeListener('invalidate', markAsUnusable)
    }
  }, [])

  // periodic sync
  React.useEffect(() => {
    if (!hasSession || !checkUnreadRef.current) {
      return
    }
    checkUnreadRef.current() // fire on init
    const interval = setInterval(
      () => checkUnreadRef.current?.({isPoll: true}),
      UPDATE_INTERVAL,
    )
    return () => clearInterval(interval)
  }, [hasSession])

  // listen for broadcasts
  React.useEffect(() => {
    const listener = ({data}: MessageEvent) => {
      cacheRef.current = {
        usableInFeed: false,
        syncedAt: new Date(),
        data: undefined,
        unreadCount:
          data.event === '30+'
            ? 30
            : data.event === ''
              ? 0
              : parseInt(data.event, 10) || 1,
      }
      setNumUnread(data.event)
    }
    broadcast.addEventListener('message', listener)
    return () => {
      broadcast.removeEventListener('message', listener)
    }
  }, [setNumUnread])

  const isFetchingRef = useRef(false)

  // create API
  const api = React.useMemo<ApiContext>(() => {
    return {
      async markAllRead() {
        // update server
        if (sonetSession.hasSession) {
          // Mark all read not yet defined in gateway; simulate by fetching and marking each or no-op
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const res: any = await (sonet.getApi() as any).fetchJson?.(`/v1/notifications`)
          const items = Array.isArray(res?.notifications) ? res.notifications : []
          await Promise.all(items.map((it: any) => (sonet.getApi() as any).fetchJson?.(`/v1/notifications/${encodeURIComponent(it.id)}/read`, {method: 'PUT'})))
        } else {
          await agent.updateSeenNotifications(
            cacheRef.current.syncedAt.toISOString(),
          )
        }

        // update & broadcast
        setNumUnread('')
        broadcast.postMessage({event: ''})
        resetBadgeCount()
      },

      async checkUnread({
        invalidate,
        isPoll,
      }: {invalidate?: boolean; isPoll?: boolean} = {}) {
        try {
          if (!agent.session) return
          if (AppState.currentState !== 'active') {
            return
          }

          // reduce polling if unread count is set
          if (isPoll && cacheRef.current?.unreadCount !== 0) {
            // if hit 30+ then don't poll, otherwise reduce polling by 50%
            if (cacheRef.current?.unreadCount >= 30 || Math.random() >= 0.5) {
              return
            }
          }

          if (isFetchingRef.current) {
            return
          }
          // Do not move this without ensuring it gets a symmetrical reset in the finally block.
          isFetchingRef.current = true

          // count
          let page: FeedPage
          let lastIndexed: string | undefined
          if (sonetSession.hasSession) {
            // Pull 40 and map
            const res = await (sonet.getApi() as any).fetchJson?.(`/v1/notifications?limit=40`)
            const items = Array.isArray(res?.notifications) ? res.notifications : []
            page = {
              cursor: res?.pagination?.cursor || undefined,
              seenAt: new Date(),
              items: items.map((it: any) => ({
                type: it.type || 'other',
                notification: {isRead: !!it.read, indexedAt: it.created_at ? new Date(it.created_at) : new Date()} as any,
                subjectUri: it.note?.id ? `sonet://note/${it.note.id}` : undefined,
                subject: undefined,
              })),
              priority: false,
            }
            lastIndexed = items[0]?.created_at
          } else {
            const result = await fetchPage({
              agent,
              cursor: undefined,
              limit: 40,
              queryClient,
              moderationOpts,
              reasons: [],
              fetchAdditionalData: !!invalidate,
            })
            page = result.page
            lastIndexed = result.indexedAt
          }
          const unreadCount = countUnread(page)
          const unreadCountStr =
            unreadCount >= 30
              ? '30+'
              : unreadCount === 0
                ? ''
                : String(unreadCount)

          // track last sync
          const now = new Date()
          const lastIndexedDate = lastIndexed
            ? new Date(lastIndexed)
            : undefined
          cacheRef.current = {
            usableInFeed: !!invalidate, // will be used immediately
            data: page,
            syncedAt:
              !lastIndexedDate || now > lastIndexedDate ? now : lastIndexedDate,
            unreadCount,
          }

          // update & broadcast
          setNumUnread(unreadCountStr)
          if (invalidate) {
            truncateAndInvalidate(queryClient, RQKEY_NOTIFS('all'))
            truncateAndInvalidate(queryClient, RQKEY_NOTIFS('mentions'))
          }
          broadcast.postMessage({event: unreadCountStr})
        } catch (e) {
          logger.warn('Failed to check unread notifications', {error: e})
        } finally {
          isFetchingRef.current = false
        }
      },

      getCachedUnreadPage() {
        // return cached page if it's marked as fresh enough
        if (cacheRef.current.usableInFeed) {
          return cacheRef.current.data
        }
      },
    }
  }, [setNumUnread, queryClient, moderationOpts, agent])
  checkUnreadRef.current = api.checkUnread

  return (
    <stateContext.Provider value={numUnread}>
      <apiContext.Provider value={api}>{children}</apiContext.Provider>
    </stateContext.Provider>
  )
}

export function useUnreadNotifications() {
  return React.useContext(stateContext)
}

export function useUnreadNotificationsApi() {
  return React.useContext(apiContext)
}

function countUnread(page: FeedPage) {
  let num = 0
  for (const item of page.items) {
    if (!item.notification.isRead) {
      num++
    }
    if (item.additional) {
      for (const item2 of item.additional) {
        if (!item2.isRead) {
          num++
        }
      }
    }
  }
  return num
}

export function invalidateCachedUnreadPage() {
  emitter.emit('invalidate')
}
