import {useCallback} from 'react'
import {type SonetActorDefs, type SonetFeedDefs, AtUri} from '@sonet/api'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {useToggleMutationQueue} from '#/lib/hooks/useToggleMutationQueue'
import {type LogEvents, toClout} from '#/lib/statsig/statsig'
import {logger} from '#/logger'
import {updateNoteShadow} from '#/state/cache/note-shadow'
import {type Shadow} from '#/state/cache/types'
import {useAgent, useSession} from '#/state/session'
import {useSonetApi, useSonetSession} from '#/state/session/sonet'
import * as userActionHistory from '#/state/userActionHistory'
import {useIsThreadMuted, useSetThreadMute} from '../cache/thread-mutes'
import {findProfileQueryData} from './profile'

const RQKEY_ROOT = 'note'
export const RQKEY = (noteUri: string) => [RQKEY_ROOT, noteUri]

export function useNoteQuery(uri: string | undefined) {
  const agent = useAgent()
  return useQuery<SonetFeedDefs.NoteView>({
    queryKey: RQKEY(uri || ''),
    async queryFn() {
      const urip = new AtUri(uri!)

      if (!urip.host.startsWith('userId:')) {
        const res = await agent.resolveUsername({
          username: urip.host,
        })
        urip.host = res.data.userId
      }

      const res = await agent.getNotes({uris: [urip.toString()]})
      if (res.success && res.data.notes[0]) {
        return res.data.notes[0]
      }

      throw new Error('No data')
    },
    enabled: !!uri,
  })
}

export function useGetNote() {
  const queryClient = useQueryClient()
  const agent = useAgent()
  return useCallback(
    async ({uri}: {uri: string}) => {
      return queryClient.fetchQuery({
        queryKey: RQKEY(uri || ''),
        async queryFn() {
          const urip = new AtUri(uri)

          if (!urip.host.startsWith('userId:')) {
            const res = await agent.resolveUsername({
              username: urip.host,
            })
            urip.host = res.data.userId
          }

          const res = await agent.getNotes({
            uris: [urip.toString()],
          })

          if (res.success && res.data.notes[0]) {
            return res.data.notes[0]
          }

          throw new Error('useGetNote: note not found')
        },
      })
    },
    [queryClient, agent],
  )
}

export function useGetNotes() {
  const queryClient = useQueryClient()
  const agent = useAgent()
  return useCallback(
    async ({uris}: {uris: string[]}) => {
      return queryClient.fetchQuery({
        queryKey: RQKEY(uris.join(',') || ''),
        async queryFn() {
          const res = await agent.getNotes({
            uris,
          })

          if (res.success) {
            return res.data.notes
          } else {
            throw new Error('useGetNotes failed')
          }
        },
      })
    },
    [queryClient, agent],
  )
}

export function useNoteLikeMutationQueue(
  note: Shadow<SonetFeedDefs.NoteView>,
  viaRenote: {uri: string; cid: string} | undefined,
  feedDescriptor: string | undefined,
  logContext: LogEvents['note:like']['logContext'] &
    LogEvents['note:unlike']['logContext'],
) {
  const queryClient = useQueryClient()
  const noteUri = note.uri
  const noteCid = note.cid
  const initialLikeUri = note.viewer?.like
  const likeMutation = useNoteLikeMutation(feedDescriptor, logContext, note)
  const unlikeMutation = useNoteUnlikeMutation(feedDescriptor, logContext)

  const queueToggle = useToggleMutationQueue({
    initialState: initialLikeUri,
    runMutation: async (prevLikeUri, shouldLike) => {
      if (shouldLike) {
        const {uri: likeUri} = await likeMutation.mutateAsync({
          uri: noteUri,
          cid: noteCid,
          via: viaRenote,
        })
        userActionHistory.like([noteUri])
        return likeUri
      } else {
        if (prevLikeUri) {
          await unlikeMutation.mutateAsync({
            noteUri: noteUri,
            likeUri: prevLikeUri,
          })
          userActionHistory.unlike([noteUri])
        }
        return undefined
      }
    },
    onSuccess(finalLikeUri) {
      // finalize
      updateNoteShadow(queryClient, noteUri, {
        likeUri: finalLikeUri,
      })
    },
  })

  const queueLike = useCallback(() => {
    // optimistically update
    updateNoteShadow(queryClient, noteUri, {
      likeUri: 'pending',
    })
    return queueToggle(true)
  }, [queryClient, noteUri, queueToggle])

  const queueUnlike = useCallback(() => {
    // optimistically update
    updateNoteShadow(queryClient, noteUri, {
      likeUri: undefined,
    })
    return queueToggle(false)
  }, [queryClient, noteUri, queueToggle])

  return [queueLike, queueUnlike]
}

function useNoteLikeMutation(
  feedDescriptor: string | undefined,
  logContext: LogEvents['note:like']['logContext'],
  note: Shadow<SonetFeedDefs.NoteView>,
) {
  const {currentAccount} = useSession()
  const queryClient = useQueryClient()
  const noteAuthor = note.author
  const agent = useAgent()
  const sonet = useSonetApi()
  const sonetSession = useSonetSession()
  return useMutation<
    {uri: string}, // responds with the uri of the like
    Error,
    {uri: string; cid: string; via?: {uri: string; cid: string}} // the note's uri and cid, and the renote uri/cid if present
  >({
    mutationFn: ({uri, cid, via}) => {
      let ownProfile: SonetActorDefs.ProfileViewDetailed | undefined
      if (currentAccount) {
        ownProfile = findProfileQueryData(queryClient, currentAccount.userId)
      }
      logger.metric('note:like', {
        logContext,
        doesNoteerFollowLiker: noteAuthor.viewer
          ? Boolean(noteAuthor.viewer.followedBy)
          : undefined,
        doesLikerFollowNoteer: noteAuthor.viewer
          ? Boolean(noteAuthor.viewer.following)
          : undefined,
        likerClout: toClout(ownProfile?.followersCount),
        noteClout:
          note.likeCount != null &&
          note.renoteCount != null &&
          note.replyCount != null
            ? toClout(note.likeCount + note.renoteCount + note.replyCount)
            : undefined,
        feedDescriptor: feedDescriptor,
      })
      if (sonetSession.hasSession) {
        const id = extractSonetNoteId(uri)
        return sonet.getApi().likeNote(id, true).then(() => ({uri}))
      }
      return agent.like(uri, cid, via)
    },
  })
}

function useNoteUnlikeMutation(
  feedDescriptor: string | undefined,
  logContext: LogEvents['note:unlike']['logContext'],
) {
  const agent = useAgent()
  const sonet = useSonetApi()
  const sonetSession = useSonetSession()
  return useMutation<void, Error, {noteUri: string; likeUri: string}>({
    mutationFn: ({likeUri}) => {
      logger.metric('note:unlike', {logContext, feedDescriptor})
      if (sonetSession.hasSession) {
        const id = extractSonetNoteId(likeUri) || extractSonetNoteIdFromNoteUri(likeUri)
        return sonet.getApi().likeNote(id, false).then(() => {})
      }
      return agent.deleteLike(likeUri)
    },
  })
}

function extractSonetNoteId(uri: string): string {
  // sonet://note/<id> or direct numeric id
  const m = /sonet:\/\/note\/([^?#]+)/.exec(uri)
  return m?.[1] || uri
}
function extractSonetNoteIdFromNoteUri(uri: string): string {
  const m = /sonet:\/\/note\/([^?#]+)/.exec(uri)
  return m?.[1] || uri
}

export function useNoteRenoteMutationQueue(
  note: Shadow<SonetFeedDefs.NoteView>,
  viaRenote: {uri: string; cid: string} | undefined,
  feedDescriptor: string | undefined,
  logContext: LogEvents['note:renote']['logContext'] &
    LogEvents['note:unrenote']['logContext'],
) {
  const queryClient = useQueryClient()
  const noteUri = note.uri
  const noteCid = note.cid
  const initialRenoteUri = note.viewer?.renote
  const renoteMutation = useNoteRenoteMutation(feedDescriptor, logContext)
  const unrenoteMutation = useNoteUnrenoteMutation(feedDescriptor, logContext)

  const queueToggle = useToggleMutationQueue({
    initialState: initialRenoteUri,
    runMutation: async (prevRenoteUri, shouldRenote) => {
      if (shouldRenote) {
        const {uri: renoteUri} = await renoteMutation.mutateAsync({
          uri: noteUri,
          cid: noteCid,
          via: viaRenote,
        })
        return renoteUri
      } else {
        if (prevRenoteUri) {
          await unrenoteMutation.mutateAsync({
            noteUri: noteUri,
            renoteUri: prevRenoteUri,
          })
        }
        return undefined
      }
    },
    onSuccess(finalRenoteUri) {
      // finalize
      updateNoteShadow(queryClient, noteUri, {
        renoteUri: finalRenoteUri,
      })
    },
  })

  const queueRenote = useCallback(() => {
    // optimistically update
    updateNoteShadow(queryClient, noteUri, {
      renoteUri: 'pending',
    })
    return queueToggle(true)
  }, [queryClient, noteUri, queueToggle])

  const queueUnrenote = useCallback(() => {
    // optimistically update
    updateNoteShadow(queryClient, noteUri, {
      renoteUri: undefined,
    })
    return queueToggle(false)
  }, [queryClient, noteUri, queueToggle])

  return [queueRenote, queueUnrenote]
}

function useNoteRenoteMutation(
  feedDescriptor: string | undefined,
  logContext: LogEvents['note:renote']['logContext'],
) {
  const agent = useAgent()
  const sonet = useSonetApi()
  const sonetSession = useSonetSession()
  return useMutation<
    {uri: string}, // responds with the uri of the renote
    Error,
    {uri: string; cid: string; via?: {uri: string; cid: string}} // the note's uri and cid, and the renote uri/cid if present
  >({
    mutationFn: ({uri, cid, via}) => {
      logger.metric('note:renote', {logContext, feedDescriptor})
      if (sonetSession.hasSession) {
        const id = extractSonetNoteId(uri)
        return sonet.getApi().renote(id, true).then(() => ({uri}))
      }
      return agent.renote(uri, cid, via)
    },
  })
}

function useNoteUnrenoteMutation(
  feedDescriptor: string | undefined,
  logContext: LogEvents['note:unrenote']['logContext'],
) {
  const agent = useAgent()
  const sonet = useSonetApi()
  const sonetSession = useSonetSession()
  return useMutation<void, Error, {noteUri: string; renoteUri: string}>({
    mutationFn: ({renoteUri}) => {
      logger.metric('note:unrenote', {logContext, feedDescriptor})
      if (sonetSession.hasSession) {
        const id = extractSonetNoteId(renoteUri)
        return sonet.getApi().renote(id, false).then(() => {})
      }
      return agent.deleteRenote(renoteUri)
    },
  })
}

export function useNoteDeleteMutation() {
  const queryClient = useQueryClient()
  const agent = useAgent()
  return useMutation<void, Error, {uri: string}>({
    mutationFn: async ({uri}) => {
      await agent.deleteNote(uri)
    },
    onSuccess(_, variables) {
      updateNoteShadow(queryClient, variables.uri, {isDeleted: true})
    },
  })
}

export function useThreadMuteMutationQueue(
  note: Shadow<SonetFeedDefs.NoteView>,
  rootUri: string,
) {
  const threadMuteMutation = useThreadMuteMutation()
  const threadUnmuteMutation = useThreadUnmuteMutation()
  const isThreadMuted = useIsThreadMuted(rootUri, note.viewer?.threadMuted)
  const setThreadMute = useSetThreadMute()

  const queueToggle = useToggleMutationQueue<boolean>({
    initialState: isThreadMuted,
    runMutation: async (_prev, shouldMute) => {
      if (shouldMute) {
        await threadMuteMutation.mutateAsync({
          uri: rootUri,
        })
        return true
      } else {
        await threadUnmuteMutation.mutateAsync({
          uri: rootUri,
        })
        return false
      }
    },
    onSuccess(finalIsMuted) {
      // finalize
      setThreadMute(rootUri, finalIsMuted)
    },
  })

  const queueMuteThread = useCallback(() => {
    // optimistically update
    setThreadMute(rootUri, true)
    return queueToggle(true)
  }, [setThreadMute, rootUri, queueToggle])

  const queueUnmuteThread = useCallback(() => {
    // optimistically update
    setThreadMute(rootUri, false)
    return queueToggle(false)
  }, [rootUri, setThreadMute, queueToggle])

  return [isThreadMuted, queueMuteThread, queueUnmuteThread] as const
}

function useThreadMuteMutation() {
  const agent = useAgent()
  return useMutation<
    {},
    Error,
    {uri: string} // the root note's uri
  >({
    mutationFn: ({uri}) => {
      logger.metric('note:mute', {})
      return agent.api.app.sonet.graph.muteThread({root: uri})
    },
  })
}

function useThreadUnmuteMutation() {
  const agent = useAgent()
  return useMutation<{}, Error, {uri: string}>({
    mutationFn: ({uri}) => {
      logger.metric('note:unmute', {})
      return agent.api.app.sonet.graph.unmuteThread({root: uri})
    },
  })
}
