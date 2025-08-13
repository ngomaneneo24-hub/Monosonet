import {
  SonetFeedDefs,
  SonetGraphDefs,
  SonetGraphGetStarterPack,
  SonetGraphStarterpack,
  SonetRichtextFacet,
  AtUri,
  SonetAppAgent,
  RichText,
} from '@sonet/api'
import {StarterPackView} from '@sonet/api/dist/client/types/app/bsky/graph/defs'
import {
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import chunk from 'lodash.chunk'

import {until} from '#/lib/async/until'
import {createStarterPackList} from '#/lib/generate-starterpack'
import {
  createStarterPackUri,
  httpStarterPackUriToAtUri,
  parseStarterPackUri,
} from '#/lib/strings/starter-pack'
import {invalidateActorStarterPacksQuery} from '#/state/queries/actor-starter-packs'
import {STALE} from '#/state/queries/index'
import {invalidateListMembersQuery} from '#/state/queries/list-members'
import {useAgent} from '#/state/session'
import * as bsky from '#/types/bsky'

const RQKEY_ROOT = 'starter-pack'
const RQKEY = ({
  uri,
  userId,
  rkey,
}: {
  uri?: string
  userId?: string
  rkey?: string
}) => {
  if (uri?.startsWith('https://') || uri?.startsWith('sonet://')) {
    const parsed = parseStarterPackUri(uri)
    return [RQKEY_ROOT, parsed?.name, parsed?.rkey]
  } else {
    return [RQKEY_ROOT, userId, rkey]
  }
}

export function useStarterPackQuery({
  uri,
  userId,
  rkey,
}: {
  uri?: string
  userId?: string
  rkey?: string
}) {
  const agent = useAgent()

  return useQuery<StarterPackView>({
    queryKey: RQKEY(uri ? {uri} : {userId, rkey}),
    queryFn: async () => {
      if (!uri) {
        uri = `sonet://${userId}/app.sonet.graph.starterpack/${rkey}`
      } else if (uri && !uri.startsWith('sonet://')) {
        uri = httpStarterPackUriToAtUri(uri) as string
      }

      const res = await agent.app.sonet.graph.getStarterPack({
        starterPack: uri,
      })
      return res.data.starterPack
    },
    enabled: Boolean(uri) || Boolean(userId && rkey),
    staleTime: STALE.MINUTES.FIVE,
  })
}

export async function invalidateStarterPack({
  queryClient,
  userId,
  rkey,
}: {
  queryClient: QueryClient
  userId: string
  rkey: string
}) {
  await queryClient.invalidateQueries({queryKey: RQKEY({userId, rkey})})
}

interface UseCreateStarterPackMutationParams {
  name: string
  description?: string
  profiles: bsky.profile.AnyProfileView[]
  feeds?: SonetFeedDefs.GeneratorView[]
}

export function useCreateStarterPackMutation({
  onSuccess,
  onError,
}: {
  onSuccess: (data: {uri: string; cid: string}) => void
  onError: (e: Error) => void
}) {
  const queryClient = useQueryClient()
  const agent = useAgent()

  return useMutation<
    {uri: string; cid: string},
    Error,
    UseCreateStarterPackMutationParams
  >({
    mutationFn: async ({name, description, feeds, profiles}) => {
      let descriptionFacets: SonetRichtextFacet.Main[] | undefined
      if (description) {
        const rt = new RichText({text: description})
        await rt.detectFacets(agent)
        descriptionFacets = rt.facets
      }

      let listRes
      listRes = await createStarterPackList({
        name,
        description,
        profiles,
        descriptionFacets,
        agent,
      })

      return await agent.app.sonet.graph.starterpack.create(
        {
          repo: agent.assertDid,
        },
        {
          name,
          description,
          descriptionFacets,
          list: listRes?.uri,
          feeds: feeds?.map(f => ({uri: f.uri})),
          createdAt: new Date().toISOString(),
        },
      )
    },
    onSuccess: async data => {
      await whenAppViewReady(agent, data.uri, v => {
        return typeof v?.data.starterPack.uri === 'string'
      })
      await invalidateActorStarterPacksQuery({
        queryClient,
        userId: agent.session!.userId,
      })
      onSuccess(data)
    },
    onError: async error => {
      onError(error)
    },
  })
}

export function useEditStarterPackMutation({
  onSuccess,
  onError,
}: {
  onSuccess: () => void
  onError: (error: Error) => void
}) {
  const queryClient = useQueryClient()
  const agent = useAgent()

  return useMutation<
    void,
    Error,
    UseCreateStarterPackMutationParams & {
      currentStarterPack: SonetGraphDefs.StarterPackView
      currentListItems: SonetGraphDefs.ListItemView[]
    }
  >({
    mutationFn: async ({
      name,
      description,
      feeds,
      profiles,
      currentStarterPack,
      currentListItems,
    }) => {
      let descriptionFacets: SonetRichtextFacet.Main[] | undefined
      if (description) {
        const rt = new RichText({text: description})
        await rt.detectFacets(agent)
        descriptionFacets = rt.facets
      }

      if (!SonetGraphStarterpack.isRecord(currentStarterPack.record)) {
        throw new Error('Invalid starter pack')
      }

      const removedItems = currentListItems.filter(
        i =>
          i.subject.userId !== agent.session?.userId &&
          !profiles.find(p => p.userId === i.subject.userId && p.userId),
      )
      if (removedItems.length !== 0) {
        const chunks = chunk(removedItems, 50)
        for (const chunk of chunks) {
          await agent.com.sonet.repo.applyWrites({
            repo: agent.session!.userId,
            writes: chunk.map(i => ({
              type: "sonet",
              collection: 'app.sonet.graph.listitem',
              rkey: new AtUri(i.uri).rkey,
            })),
          })
        }
      }

      const addedProfiles = profiles.filter(
        p => !currentListItems.find(i => i.subject.userId === p.userId),
      )
      if (addedProfiles.length > 0) {
        const chunks = chunk(addedProfiles, 50)
        for (const chunk of chunks) {
          await agent.com.sonet.repo.applyWrites({
            repo: agent.session!.userId,
            writes: chunk.map(p => ({
              type: "sonet",
              collection: 'app.sonet.graph.listitem',
              value: {
                type: "sonet",
                subject: p.userId,
                list: currentStarterPack.list?.uri,
                createdAt: new Date().toISOString(),
              },
            })),
          })
        }
      }

      const rkey = parseStarterPackUri(currentStarterPack.uri)!.rkey
      await agent.com.sonet.repo.putRecord({
        repo: agent.session!.userId,
        collection: 'app.sonet.graph.starterpack',
        rkey,
        record: {
          name,
          description,
          descriptionFacets,
          list: currentStarterPack.list?.uri,
          feeds,
          createdAt: currentStarterPack.record.createdAt,
          updatedAt: new Date().toISOString(),
        },
      })
    },
    onSuccess: async (_, {currentStarterPack}) => {
      const parsed = parseStarterPackUri(currentStarterPack.uri)
      await whenAppViewReady(agent, currentStarterPack.uri, v => {
        return currentStarterPack.cid !== v?.data.starterPack.cid
      })
      await invalidateActorStarterPacksQuery({
        queryClient,
        userId: agent.session!.userId,
      })
      if (currentStarterPack.list) {
        await invalidateListMembersQuery({
          queryClient,
          uri: currentStarterPack.list.uri,
        })
      }
      await invalidateStarterPack({
        queryClient,
        userId: agent.session!.userId,
        rkey: parsed!.rkey,
      })
      onSuccess()
    },
    onError: error => {
      onError(error)
    },
  })
}

export function useDeleteStarterPackMutation({
  onSuccess,
  onError,
}: {
  onSuccess: () => void
  onError: (error: Error) => void
}) {
  const agent = useAgent()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({listUri, rkey}: {listUri?: string; rkey: string}) => {
      if (!agent.session) {
        throw new Error(`Requires signed in user`)
      }

      if (listUri) {
        await agent.app.sonet.graph.list.delete({
          repo: agent.session.userId,
          rkey: new AtUri(listUri).rkey,
        })
      }
      await agent.app.sonet.graph.starterpack.delete({
        repo: agent.session.userId,
        rkey,
      })
    },
    onSuccess: async (_, {listUri, rkey}) => {
      const uri = createStarterPackUri({
        userId: agent.session!.userId,
        rkey,
      })

      if (uri) {
        await whenAppViewReady(agent, uri, v => {
          return Boolean(v?.data?.starterPack) === false
        })
      }

      if (listUri) {
        await invalidateListMembersQuery({queryClient, uri: listUri})
      }
      await invalidateActorStarterPacksQuery({
        queryClient,
        userId: agent.session!.userId,
      })
      await invalidateStarterPack({
        queryClient,
        userId: agent.session!.userId,
        rkey,
      })
      onSuccess()
    },
    onError: error => {
      onError(error)
    },
  })
}

async function whenAppViewReady(
  agent: SonetAppAgent,
  uri: string,
  fn: (res?: SonetGraphGetStarterPack.Response) => boolean,
) {
  await until(
    5, // 5 tries
    1e3, // 1s delay between tries
    fn,
    () => agent.app.sonet.graph.getStarterPack({starterPack: uri}),
  )
}

export async function precacheStarterPack(
  queryClient: QueryClient,
  starterPack:
    | SonetGraphDefs.StarterPackViewBasic
    | SonetGraphDefs.StarterPackView,
) {
  if (!SonetGraphStarterpack.isRecord(starterPack.record)) {
    return
  }

  let starterPackView: SonetGraphDefs.StarterPackView | undefined
  if (SonetGraphDefs.isStarterPackView(starterPack)) {
    starterPackView = starterPack
  } else if (
    SonetGraphDefs.isStarterPackViewBasic(starterPack) &&
    bsky.validate(starterPack.record, SonetGraphStarterpack.validateRecord)
  ) {
    const listView: SonetGraphDefs.ListViewBasic = {
      uri: starterPack.record.list,
      // This will be populated once the data from server is fetched
      cid: '',
      name: starterPack.record.name,
      purpose: 'app.sonet.graph.defs#referencelist',
    }
    starterPackView = {
      ...starterPack,
      type: "sonet",
      list: listView,
    }
  }

  if (starterPackView) {
    queryClient.setQueryData(RQKEY({uri: starterPack.uri}), starterPackView)
  }
}
