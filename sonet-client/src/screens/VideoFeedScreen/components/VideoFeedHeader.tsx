import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions
} from 'react-native'
import {useSafeAreaInsets} from 'react-native-safe-area-context'

const {width: screenWidth} = Dimensions.get('window')

interface VideoFeedHeaderProps {
  feedType: 'trending' | 'for_you' | 'following'
  onFeedTypeChange: (feedType: 'trending' | 'for_you' | 'following') => void
}

export const VideoFeedHeader: React.FC<VideoFeedHeaderProps> = ({
  feedType,
  onFeedTypeChange
}) => {
  const insets = useSafeAreaInsets()

  const feedTypes = [
    {key: 'trending', label: 'Trending', icon: '🔥'},
    {key: 'for_you', label: 'For You', icon: '🎯'},
    {key: 'following', label: 'Following', icon: '👥'}
  ] as const

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      {/* Main Header */}
      <View style={styles.mainHeader}>
        <Text style={styles.title}>Videos</Text>
        <TouchableOpacity style={styles.searchButton}>
          <Text style={styles.searchIcon}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* Feed Type Tabs */}
      <View style={styles.tabsContainer}>
        {feedTypes.map((type) => (
          <TouchableOpacity
            key={type.key}
            style={[
              styles.tab,
              feedType === type.key && styles.activeTab
            ]}
            onPress={() => onFeedTypeChange(type.key)}
            activeOpacity={0.7}
          >
            <Text style={styles.tabIcon}>{type.icon}</Text>
            <Text style={[
              styles.tabLabel,
              feedType === type.key && styles.activeTabLabel
            ]}>
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search Bar (Hidden by default, can be toggled) */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search videos..."
          placeholderTextColor="#999"
          returnKeyType="search"
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  mainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchIcon: {
    fontSize: 18,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabLabel: {
    color: '#FFFFFF',
  },
  searchContainer: {
    display: 'none', // Hidden by default
  },
  searchInput: {
    height: 44,
    backgroundColor: '#F8F9FA',
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1A1A1A',
  },
})