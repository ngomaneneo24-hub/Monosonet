// For You Feed - ML-powered personalized content with TikTok-style addictive features
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {View, StyleSheet, RefreshControl, Text} from 'react-native'
import {useLingui} from '@lingui/react'
import {msg} from '@lingui/macro'
import {useFocusEffect} from '@react-navigation/native'

import {useForYouFeedQuery, useForYouFeedInteractionMutation} from '#/state/queries/for-you-feed'
import {useSession} from '#/state/session'
import {useSetMinimalShellMode} from '#/state/shell'
import {useHeaderOffset} from '#/components/hooks/useHeaderOffset'
import {List, type ListRef} from '#/view/com/util/List'
import {LoadMoreRetryBtn} from '#/view/com/util/LoadMoreRetryBtn'
import {NoteFeedLoadingPlaceholder} from '#/view/com/util/LoadingPlaceholder'
import {MainScrollProvider} from '#/view/com/util/MainScrollProvider'
import {ForYouFeedHeader} from './components/ForYouFeedHeader'
import {ForYouFeedItem} from './components/ForYouFeedItem'
import {MLInsightsPanel} from './components/MLInsightsPanel'
import {PersonalizationSettings} from './components/PersonalizationSettings'
import {type ForYouFeedItem as ForYouFeedItemType} from '#/state/queries/for-you-feed'

const POLL_FREQ = 30e3 // 30 seconds - ML rankings can change frequently

export function ForYouFeedScreen() {
  const {hasSession} = useSession()
  const {_} = useLingui()
  const setMinimalShellMode = useSetMinimalShellMode()
  const headerOffset = useHeaderOffset()
  const scrollElRef = useRef<ListRef>(null)
  
  // ML-powered feed query
  const {
    data: feedData,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching
  } = useForYouFeedQuery({
    limit: 20,
    engagement: true // Include engagement history for better ML
  })

  // Interaction tracking for ML training
  const trackInteraction = useForYouFeedInteractionMutation()

  // State for ML insights panel
  const [showMLInsights, setShowMLInsights] = useState(false)
  const [selectedNote, setSelectedNote] = useState<ForYouFeedItemType | null>(null)

  // State for personalization settings
  const [showPersonalization, setShowPersonalization] = useState(false)

  // Auto-refresh for ML ranking updates
  useEffect(() => {
    if (!hasSession) return

    const interval = setInterval(() => {
      refetch()
    }, POLL_FREQ)

    return () => clearInterval(interval)
  }, [hasSession, refetch])

  // Focus effects
  useFocusEffect(
    useCallback(() => {
      setMinimalShellMode(false)
    }, [setMinimalShellMode])
  )

  // Transform feed data for rendering
  const feedItems = useMemo(() => {
    if (!feedData?.pages) return []
    
    return feedData.pages.flatMap(page => 
      page.items.map((item, index) => ({
        ...item,
        _reactKey: `${item.note.uri}-${index}`,
        _isFeedNoteSlice: true
      }))
    )
  }, [feedData])

  // Username note selection for ML insights
  const usernameNotePress = useCallback((note: ForYouFeedItemType) => {
    setSelectedNote(note)
    setShowMLInsights(true)
  }, [])

  // Username interaction tracking
  const usernameInteraction = useCallback((interaction: any) => {
    trackInteraction.mutate(interaction)
  }, [trackInteraction])

  // Render feed item
  const renderFeedItem = useCallback(({item}: {item: ForYouFeedItemType}) => (
    <ForYouFeedItem
      item={item}
      onPress={() => usernameNotePress(item)}
      onInteraction={usernameInteraction}
      showMLInsights={true}
    />
  ), [usernameNotePress, usernameInteraction])

  // Render empty state
  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyState}>
      <View style={styles.emptyStateContent}>
        <Text style={styles.emptyStateTitle}>
          {_(msg`Your personalized feed is learning`)}
        </Text>
        <Text style={styles.emptyStateSubtitle}>
          {_(msg`We're analyzing your interests to show you the best content`)}
        </Text>
        <Text style={styles.emptyStateHint}>
          {_(msg`Try following some accounts or engaging with notes to get started`)}
        </Text>
      </View>
    </View>
  ), [_])

  // Render error state
  const renderErrorState = useCallback(() => (
    <View style={styles.errorState}>
      <Text style={styles.errorTitle}>
        {_(msg`Failed to load your personalized feed`)}
      </Text>
      <Text style={styles.errorMessage}>
        {error?.message || _(msg`Something went wrong. Please try again.`)}
      </Text>
      <LoadMoreRetryBtn onPress={() => refetch()} />
    </View>
  ), [error, refetch, _])

  // Render loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ForYouFeedHeader
          onPersonalizationPress={() => setShowPersonalization(true)}
          showMLInsights={showMLInsights}
          onToggleMLInsights={() => setShowMLInsights(!showMLInsights)}
        />
        <NoteFeedLoadingPlaceholder />
      </View>
    )
  }

  // Render error state
  if (isError) {
    return (
      <View style={styles.container}>
        <ForYouFeedHeader
          onPersonalizationPress={() => setShowPersonalization(true)}
          showMLInsights={showMLInsights}
          onToggleMLInsights={() => setShowMLInsights(!showMLInsights)}
        />
        {renderErrorState()}
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <MainScrollProvider>
        <ForYouFeedHeader
          onPersonalizationPress={() => setShowPersonalization(true)}
          showMLInsights={showMLInsights}
          onToggleMLInsights={() => setShowMLInsights(!showMLInsights)}
        />
        
        <List
          ref={scrollElRef}
          data={feedItems}
          renderItem={renderFeedItem}
          keyExtractor={(item) => item._reactKey}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage()
            }
          }}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#007AFF"
            />
          }
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={
            isFetchingNextPage ? (
              <NoteFeedLoadingPlaceholder />
            ) : null
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={5}
        />

        {/* ML Insights Panel */}
        {showMLInsights && selectedNote && (
          <MLInsightsPanel
            note={selectedNote}
            onClose={() => {
              setShowMLInsights(false)
              setSelectedNote(null)
            }}
          />
        )}

        {/* Personalization Settings */}
        {showPersonalization && (
          <PersonalizationSettings
            onClose={() => setShowPersonalization(false)}
          />
        )}
      </MainScrollProvider>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40
  },
  emptyStateContent: {
    alignItems: 'center',
    maxWidth: 300
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    color: '#000'
  },
  emptyStateSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
    color: '#666',
    lineHeight: 22
  },
  emptyStateHint: {
    fontSize: 14,
    textAlign: 'center',
    color: '#999',
    lineHeight: 20
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    color: '#FF3B30'
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
    lineHeight: 22
  }
})