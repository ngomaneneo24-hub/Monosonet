import React, {useCallback, useState, useMemo} from 'react'
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {EnhancedFeedItem} from './EnhancedFeedItem'
import {type SonetNote, type SonetUser} from '#/types/sonet'
import {Text as TypographyText} from '#/components/Typography'

interface EnhancedFeedProps {
  notes: SonetNote[]
  isLoading?: boolean
  isRefreshing?: boolean
  hasMore?: boolean
  onRefresh?: () => void
  onLoadMore?: () => void
  onNotePress?: (note: SonetNote) => void
  onUserPress?: (user: SonetUser) => void
  onLike?: (note: SonetNote) => void
  onReply?: (note: SonetNote) => void
  onRepost?: (note: SonetNote) => void
  onShare?: (note: SonetNote) => void
  onViewLikes?: (note: SonetNote) => void
  onViewReplies?: (note: SonetNote) => void
  onViewViews?: (note: SonetNote) => void
  onImagePress?: (note: SonetNote, index: number) => void
  onHashtagPress?: (hashtag: string) => void
  onMentionPress?: (mention: string) => void
}

export function EnhancedFeed({
  notes,
  isLoading = false,
  isRefreshing = false,
  hasMore = false,
  onRefresh,
  onLoadMore,
  onNotePress,
  onUserPress,
  onLike,
  onReply,
  onRepost,
  onShare,
  onViewLikes,
  onViewReplies,
  onViewViews,
  onImagePress,
  onHashtagPress,
  onMentionPress,
}: EnhancedFeedProps) {
  const t = useTheme()
  const {_} = useLingui()

  const handleNotePress = useCallback((note: SonetNote) => {
    onNotePress?.(note)
  }, [onNotePress])

  const handleUserPress = useCallback((user: SonetUser) => {
    onUserPress?.(user)
  }, [onUserPress])

  const handleLike = useCallback((note: SonetNote) => {
    onLike?.(note)
  }, [onLike])

  const handleReply = useCallback((note: SonetNote) => {
    onReply?.(note)
  }, [onReply])

  const handleRepost = useCallback((note: SonetNote) => {
    onRepost?.(note)
  }, [onRepost])

  const handleShare = useCallback((note: SonetNote) => {
    onShare?.(note)
  }, [onShare])

  const handleViewLikes = useCallback((note: SonetNote) => {
    onViewLikes?.(note)
  }, [onViewLikes])

  const handleViewReplies = useCallback((note: SonetNote) => {
    onViewReplies?.(note)
  }, [onViewReplies])

  const handleViewViews = useCallback((note: SonetNote) => {
    onViewViews?.(note)
  }, [onViewViews])

  const handleImagePress = useCallback((note: SonetNote, index: number) => {
    onImagePress?.(note, index)
  }, [onImagePress])

  const handleHashtagPress = useCallback((hashtag: string) => {
    onHashtagPress?.(hashtag)
  }, [onHashtagPress])

  const handleMentionPress = useCallback((mention: string) => {
    onMentionPress?.(mention)
  }, [onMentionPress])

  const renderNoteItem = useCallback(({item: note}: {item: SonetNote}) => {
    return (
      <EnhancedFeedItem
        note={note}
        onPress={() => handleNotePress(note)}
        onUserPress={handleUserPress}
        onLike={() => handleLike(note)}
        onReply={() => handleReply(note)}
        onRepost={() => handleRepost(note)}
        onShare={() => handleShare(note)}
        onViewLikes={() => handleViewLikes(note)}
        onViewReplies={() => handleViewReplies(note)}
        onViewViews={() => handleViewViews(note)}
        onImagePress={(index) => handleImagePress(note, index)}
        onHashtagPress={handleHashtagPress}
        onMentionPress={handleMentionPress}
      />
    )
  }, [
    handleNotePress,
    handleUserPress,
    handleLike,
    handleReply,
    handleRepost,
    handleShare,
    handleViewLikes,
    handleViewReplies,
    handleViewViews,
    handleImagePress,
    handleHashtagPress,
    handleMentionPress,
  ])

  const renderFooter = useCallback(() => {
    if (!hasMore) return null
    
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={t.atoms.text_contrast_medium.color} />
      </View>
    )
  }, [hasMore, t.atoms.text_contrast_medium.color])

  const renderEmptyState = useCallback(() => {
    if (isLoading) return null
    
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyStateContent}>
          <View style={[styles.emptyStateIcon, t.atoms.bg_contrast_25]} />
          <View style={styles.emptyStateText}>
            <TypographyText style={[styles.emptyStateTitle, t.atoms.text_primary]}>
              No posts yet
            </TypographyText>
            <TypographyText style={[styles.emptyStateSubtitle, t.atoms.text_contrast_medium]}>
              When you follow people, their posts will appear here
            </TypographyText>
          </View>
        </View>
      </View>
    )
  }, [isLoading, t.atoms.bg_contrast_25, t.atoms.text_primary, t.atoms.text_contrast_medium])

  const keyExtractor = useCallback((item: SonetNote) => item.id, [])

  const handleEndReached = useCallback(() => {
    if (hasMore && !isLoading) {
      onLoadMore?.()
    }
  }, [hasMore, isLoading, onLoadMore])

  const refreshControl = useMemo(() => {
    if (!onRefresh) return undefined
    
    return (
      <RefreshControl
        refreshing={isRefreshing}
        onRefresh={onRefresh}
        tintColor={t.atoms.text_contrast_medium.color}
        colors={[t.atoms.text_contrast_medium.color]}
      />
    )
  }, [isRefreshing, onRefresh, t.atoms.text_contrast_medium.color])

  if (isLoading && notes.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={t.atoms.text_contrast_medium.color} />
      </View>
    )
  }

  return (
    <FlatList
      data={notes}
      renderItem={renderNoteItem}
      keyExtractor={keyExtractor}
      style={[styles.container, t.atoms.bg_contrast_0]}
      contentContainerStyle={styles.contentContainer}
      refreshControl={refreshControl}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmptyState}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={Platform.OS === 'android'}
      maxToRenderPerBatch={10}
      windowSize={10}
      initialNumToRender={5}
      getItemLayout={(data, index) => ({
        length: 200, // Approximate height of each item
        offset: 200 * index,
        index,
      })}
    />
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyStateContent: {
    alignItems: 'center',
    maxWidth: 280,
  },
  emptyStateIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 16,
  },
  emptyStateText: {
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
})