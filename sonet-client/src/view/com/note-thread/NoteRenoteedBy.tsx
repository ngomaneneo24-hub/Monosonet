import {useCallback, useMemo, useState} from 'react'
import {SonetActorDefs as ActorDefs} from '@sonet/api'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {useInitialNumToRender} from '#/lib/hooks/useInitialNumToRender'
import {cleanError} from '#/lib/strings/errors'
import {logger} from '#/logger'
import {useNoteRenoteedByQuery} from '#/state/queries/note-renoteed-by'
import {useResolveUriQuery} from '#/state/queries/resolve-uri'
import {ProfileCardWithFollowBtn} from '#/view/com/profile/ProfileCard'
import {List} from '#/view/com/util/List'
import {ListFooter, ListMaybePlaceholder} from '#/components/Lists'

function renderItem({
  item,
  index,
}: {
  item: ActorDefs.ProfileView
  index: number
}) {
  return (
    <ProfileCardWithFollowBtn
      key={item.userId}
      profile={item}
      noBorder={index === 0}
    />
  )
}

function keyExtractor(item: ActorDefs.ProfileViewBasic) {
  return item.userId
}

export function NoteRenoteedBy({uri}: {uri: string}) {
  const {_} = useLingui()
  const initialNumToRender = useInitialNumToRender()

  const [isPTRing, setIsPTRing] = useState(false)

  const {
    data: resolvedUri,
    error: resolveError,
    isLoading: isLoadingUri,
  } = useResolveUriQuery(uri)
  const {
    data,
    isLoading: isLoadingRenoteedBy,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    refetch,
  } = useNoteRenoteedByQuery(resolvedUri?.uri)

  const isError = Boolean(resolveError || error)

  const renoteedBy = useMemo(() => {
    if (data?.pages) {
      return data.pages.flatMap(page => page.renoteedBy)
    }
    return []
  }, [data])

  const onRefresh = useCallback(async () => {
    setIsPTRing(true)
    try {
      await refetch()
    } catch (err) {
      logger.error('Failed to refresh renotes', {message: err})
    }
    setIsPTRing(false)
  }, [refetch, setIsPTRing])

  const onEndReached = useCallback(async () => {
    if (isFetchingNextPage || !hasNextPage || isError) return
    try {
      await fetchNextPage()
    } catch (err) {
      logger.error('Failed to load more renotes', {message: err})
    }
  }, [isFetchingNextPage, hasNextPage, isError, fetchNextPage])

  if (renoteedBy.length < 1) {
    return (
      <ListMaybePlaceholder
        isLoading={isLoadingUri || isLoadingRenoteedBy}
        isError={isError}
        emptyType="results"
        emptyTitle={_(msg`No renotes yet`)}
        emptyMessage={_(
          msg`Nobody has renoteed this yet. Maybe you should be the first!`,
        )}
        errorMessage={cleanError(resolveError || error)}
        sideBorders={false}
      />
    )
  }

  // loaded
  // =
  return (
    <List
      data={renoteedBy}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      refreshing={isPTRing}
      onRefresh={onRefresh}
      onEndReached={onEndReached}
      onEndReachedThreshold={4}
      ListFooterComponent={
        <ListFooter
          isFetchingNextPage={isFetchingNextPage}
          error={cleanError(error)}
          onRetry={fetchNextPage}
        />
      }
      // @ts-ignore our .web version only -prf
      desktopFixedHeight
      initialNumToRender={initialNumToRender}
      windowSize={11}
      sideBorders={false}
    />
  )
}
