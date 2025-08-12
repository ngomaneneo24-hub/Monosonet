import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useMutation, useQueryClient} from '@tanstack/react-query'

import {logger} from '#/logger'
import {RQKEY as FEED_RQKEY} from '#/state/queries/note-feed'
import * as Toast from '#/view/com/util/Toast'
import {updateNoteShadow} from '../cache/note-shadow'
import {useAgent, useSession} from '../session'
import {useProfileUpdateMutation} from './profile'

export function usePinnedNoteMutation() {
  const {_} = useLingui()
  const {currentAccount} = useSession()
  const agent = useAgent()
  const queryClient = useQueryClient()
  const {mutateAsync: profileUpdateMutate} = useProfileUpdateMutation()

  return useMutation({
    mutationFn: async ({
      noteUri,
      noteCid,
      action,
    }: {
      noteUri: string
      noteCid: string
      action: 'pin' | 'unpin'
    }) => {
      const pinCurrentNote = action === 'pin'
      let prevPinnedNote: string | undefined
      try {
        updateNoteShadow(queryClient, noteUri, {pinned: pinCurrentNote})

        // get the currently pinned note so we can optimistically remove the pin from it
        if (!currentAccount) throw new Error('Not signed in')
        const {data: profile} = await agent.getProfile({
          actor: currentAccount.userId,
        })
        prevPinnedNote = profile.pinnedNote?.uri
        if (prevPinnedNote && prevPinnedNote !== noteUri) {
          updateNoteShadow(queryClient, prevPinnedNote, {pinned: false})
        }

        await profileUpdateMutate({
          profile,
          updates: existing => {
            existing.pinnedNote = pinCurrentNote
              ? {uri: noteUri, cid: noteCid}
              : undefined
            return existing
          },
          checkCommitted: res =>
            pinCurrentNote
              ? res.data.pinnedNote?.uri === noteUri
              : !res.data.pinnedNote,
        })

        if (pinCurrentNote) {
          Toast.show(_(msg({message: 'Note pinned', context: 'toast'})))
        } else {
          Toast.show(_(msg({message: 'Note unpinned', context: 'toast'})))
        }

        queryClient.invalidateQueries({
          queryKey: FEED_RQKEY(
            `author|${currentAccount.userId}|notes_and_author_threads`,
          ),
        })
        queryClient.invalidateQueries({
          queryKey: FEED_RQKEY(
            `author|${currentAccount.userId}|notes_with_replies`,
          ),
        })
      } catch (e: any) {
        Toast.show(_(msg`Failed to pin note`))
        logger.error('Failed to pin note', {message: String(e)})
        // revert optimistic update
        updateNoteShadow(queryClient, noteUri, {
          pinned: !pinCurrentNote,
        })
        if (prevPinnedNote && prevPinnedNote !== noteUri) {
          updateNoteShadow(queryClient, prevPinnedNote, {pinned: true})
        }
      }
    },
  })
}
