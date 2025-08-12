import React, {useState, useCallback, useRef} from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  Alert
} from 'react-native'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {useVideoFeedQuery} from '../../state/queries/video-feed'
import {VideoFeedItem} from './components/VideoFeedItem'
import {VideoFeedHeader} from './components/VideoFeedHeader'
import {VideoFeedEmpty} from './components/VideoFeedEmpty'
import {VideoFeedError} from './components/VideoFeedError'
import {VideoDetailModal} from './components/VideoDetailModal'
import {createTrendingFeedRequest} from '../../lib/api/video-feed'
import {VideoItem} from '../../lib/api/video-feed'

const {width: screenWidth} = Dimensions.get('window')
const COLUMN_COUNT = 2
const ITEM_WIDTH = (screenWidth - 24 - (COLUMN_COUNT - 1) * 8) / COLUMN_COUNT
const ITEM_HEIGHT = ITEM_WIDTH * 1.5 // 3:2 aspect ratio

export const VideoFeedScreen: React.FC = () => {
  const insets = useSafeAreaInsets()
  const [refreshing, setRefreshing] = useState(false)
  const [feedType, setFeedType] = useState<'trending' | 'for_you' | 'following'>('trending')
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null)
  const [isVideoModalVisible, setIsVideoModalVisible] = useState(false)
  const flatListRef = useRef<FlatList>(null)

  // Video feed query with infinite scrolling
  const {
    data: videoFeed,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch
  } = useVideoFeedQuery({
    request: createTrendingFeedRequest(20),
    enabled: true
  })

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await refetch()
    } catch (err) {
      console.error('Failed to refresh video feed:', err)
    } finally {
      setRefreshing(false)
    }
  }, [refetch])

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // Handle feed type change
  const handleFeedTypeChange = useCallback((newFeedType: typeof feedType) => {
    setFeedType(newFeedType)
    // TODO: Refetch with new feed type
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({offset: 0, animated: true})
    }
  }, [])

  // Handle video selection
  const handleVideoPress = useCallback((video: VideoItem) => {
    setSelectedVideo(video)
    setIsVideoModalVisible(true)
  }, [])

  // Handle video modal close
  const handleVideoModalClose = useCallback(() => {
    setIsVideoModalVisible(false)
    setSelectedVideo(null)
  }, [])

  // Render video item
  const renderVideoItem = useCallback(({item, index}: {item: any; index: number}) => {
    return (
      <VideoFeedItem
        video={item}
        width={ITEM_WIDTH}
        height={ITEM_HEIGHT}
        onPress={() => {
          // TODO: Navigate to video detail
          console.log('Video pressed:', item.id)
        }}
        onVideoPress={handleVideoPress}
        onLike={() => {
          // TODO: Handle like
          console.log('Video liked:', item.id)
        }}
        onRepost={() => {
          // TODO: Handle repost
          console.log('Video reposted:', item.id)
        }}
        onShare={() => {
          // TODO: Handle share
          console.log('Video shared:', item.id)
        }}
      />
    )
  })

  // Render footer with loading indicator
  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.footerText}>Loading more videos...</Text>
      </View>
    )
  }, [isFetchingNextPage])

  // Render empty state
  if (!isLoading && (!videoFeed || videoFeed.pages[0]?.items?.length === 0)) {
    return (
      <View style={[styles.container, {paddingTop: insets.top}]}>
        <VideoFeedHeader
          feedType={feedType}
          onFeedTypeChange={handleFeedTypeChange}
        />
        <VideoFeedEmpty />
      </View>
    )
  }

  // Render error state
  if (isError && error) {
    return (
      <View style={[styles.container, {paddingTop: insets.top}]}>
        <VideoFeedHeader
          feedType={feedType}
          onFeedTypeChange={handleFeedTypeChange}
        />
        <VideoFeedError
          error={error}
          onRetry={() => refetch()}
        />
      </View>
    )
  }

  // Flatten all pages for FlatList
  const allVideos = videoFeed?.pages.flatMap(page => page.items) || []

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      <VideoFeedHeader
        feedType={feedType}
        onFeedTypeChange={handleFeedTypeChange}
      />
      
      <FlatList
        ref={flatListRef}
        data={allVideos}
        renderItem={renderVideoItem}
        keyExtractor={(item) => item.id}
        numColumns={COLUMN_COUNT}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#007AFF"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={8}
      />
      
              {isLoading && !refreshing && (
          <View style={styles.initialLoader}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading videos...</Text>
          </View>
        )}
      </View>

      {/* Video Detail Modal */}
      <VideoDetailModal
        video={selectedVideo}
        isVisible={isVideoModalVisible}
        onClose={handleVideoModalClose}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  initialLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
})