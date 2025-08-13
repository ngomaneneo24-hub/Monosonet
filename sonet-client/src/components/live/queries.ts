import {
  type $Typed,
  type SonetActorStatus,
  type SonetEmbedExternal,
  SonetRepoPutRecord,
} from '@sonet/api'
import {retry} from '@sonet/types'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {uploadBlob} from '#/lib/api'
import {imageToThumb} from '#/lib/api/resolve'
import {getLinkMeta, type LinkMeta} from '#/lib/link-meta/link-meta'
import {logger} from '#/logger'
import {updateProfileShadow} from '#/state/cache/profile-shadow'
import {useLiveNowConfig} from '#/state/service-config'
import {useAgent, useSession} from '#/state/session'
import * as Toast from '#/view/com/util/Toast'
import {useDialogContext} from '#/components/Dialog'

export function useLiveLinkMetaQuery(url: string | null) {
  const liveNowConfig = useLiveNowConfig()
  const {currentAccount} = useSession()
  const {_} = useLingui()

  const agent = useAgent()
  return useQuery({
    enabled: !!url,
    queryKey: ['link-meta', url],
    queryFn: async () => {
      if (!url) return undefined
      const config = liveNowConfig.find(cfg => cfg.userId === currentAccount?.userId)

      if (!config) throw new Error(_(msg`You are not allowed to go live`))

      const urlp = new URL(url)
      if (!config.domains.includes(urlp.hostname)) {
        throw new Error(_(msg`${urlp.hostname} is not a valid URL`))
      }

      return await getLinkMeta(agent, url)
    },
  })
}

export function useUpsertLiveStatusMutation(
  duration: number,
  linkMeta: LinkMeta | null | undefined,
  createdAt?: string,
) {
  const {currentAccount} = useSession()
  const agent = useAgent()
  const queryClient = useQueryClient()
  const control = useDialogContext()
  const {_} = useLingui()

  return useMutation({
    mutationFn: async () => {
      if (!currentAccount) throw new Error('Not logged in')

      let embed: $Typed<SonetEmbedExternal.Main> | undefined

      if (linkMeta) {
        let thumb

        if (linkMeta.image) {
          try {
            const img = await imageToThumb(linkMeta.image)
            if (img) {
              const blob = await uploadBlob(
                agent,
                img.source.path,
                img.source.mime,
              )
              thumb = blob.data.blob
            }
          } catch (e: any) {
            logger.error(`Failed to upload thumbnail for live status`, {
              url: linkMeta.url,
              image: linkMeta.image,
              safeMessage: e,
            })
          }
        }

        embed = {
          type: "sonet",
          external: {
            type: "sonet",
            title: linkMeta.title ?? '',
            description: linkMeta.description ?? '',
            uri: linkMeta.url,
            thumb,
          },
        }
      }

      const record = {
        type: "sonet",
        createdAt: createdAt ?? new Date().toISOString(),
        status: 'app.sonet.actor.status#live',
        durationMinutes: duration,
        embed,
      } satisfies SonetActorStatus.Record

      const upsert = async () => {
        const repo = currentAccount.userId
        const collection = 'app.sonet.actor.status'

        const existing = await agent.com.sonet.repo
          .getRecord({repo, collection, rkey: 'self'})
          .catch(_e => undefined)

        await agent.com.sonet.repo.putRecord({
          repo,
          collection,
          rkey: 'self',
          record,
          swapRecord: existing?.data.cid || null,
        })
      }

      await retry(upsert, {
        maxRetries: 5,
        retryable: e => e instanceof SonetRepoPutRecord.InvalidSwapError,
      })

      return {
        record,
        image: linkMeta?.image,
      }
    },
    onError: (e: any) => {
      logger.error(`Failed to upsert live status`, {
        url: linkMeta?.url,
        image: linkMeta?.image,
        safeMessage: e,
      })
    },
    onSuccess: ({record, image}) => {
      if (createdAt) {
        logger.metric(
          'live:edit',
          {duration: record.durationMinutes},
          {statsig: true},
        )
      } else {
        logger.metric(
          'live:create',
          {duration: record.durationMinutes},
          {statsig: true},
        )
      }

      Toast.show(_(msg`You are now live!`))
      control.close(() => {
        if (!currentAccount) return

        const expiresAt = new Date(record.createdAt)
        expiresAt.setMinutes(expiresAt.getMinutes() + record.durationMinutes)

        updateProfileShadow(queryClient, currentAccount.userId, {
          status: {
            type: "sonet",
            status: 'app.sonet.actor.status#live',
            isActive: true,
            expiresAt: expiresAt.toISOString(),
            embed:
              record.embed && image
                ? {
                    type: "sonet",
                    external: {
                      ...record.embed.external,
                      type: "sonet",
                      thumb: image,
                    },
                  }
                : undefined,
            record,
          },
        })
      })
    },
  })
}

export function useRemoveLiveStatusMutation() {
  const {currentAccount} = useSession()
  const agent = useAgent()
  const queryClient = useQueryClient()
  const control = useDialogContext()
  const {_} = useLingui()

  return useMutation({
    mutationFn: async () => {
      if (!currentAccount) throw new Error('Not logged in')

      await agent.app.sonet.actor.status.delete({
        repo: currentAccount.userId,
        rkey: 'self',
      })
    },
    onError: (e: any) => {
      logger.error(`Failed to remove live status`, {
        safeMessage: e,
      })
    },
    onSuccess: () => {
      logger.metric('live:remove', {}, {statsig: true})
      Toast.show(_(msg`You are no longer live`))
      control.close(() => {
        if (!currentAccount) return

        updateProfileShadow(queryClient, currentAccount.userId, {
          status: undefined,
        })
      })
    },
  })
}
