// Sonet Centralized Feed Configuration
// No external feed generators - all feeds are hardcoded and controlled by the platform

import {SONET_FEEDS} from './constants'

export interface SonetFeedDefinition {
  id: string
  type: 'timeline' | 'feed'
  value: string
  displayName: string
  description: string
  icon?: string
  contentMode: 'text' | 'images' | 'video'
  isDefault?: boolean
  requiresAuth?: boolean
  mlEnabled?: boolean // For ML ranking and personalization
}

export const SONET_FEED_DEFINITIONS: Record<string, SonetFeedDefinition> = {
  [SONET_FEEDS.FOLLOWING]: {
    id: 'following',
    type: 'timeline',
    value: SONET_FEEDS.FOLLOWING,
    displayName: 'Following',
    description: 'Posts from people you follow',
    icon: '👥',
    contentMode: 'text',
    isDefault: true,
    requiresAuth: true,
    mlEnabled: false // Simple chronological timeline
  },
  
  [SONET_FEEDS.FOR_YOU]: {
    id: 'for-you',
    type: 'feed',
    value: SONET_FEEDS.FOR_YOU,
    displayName: 'For You',
    description: 'AI-powered personalized feed with ML ranking',
    icon: '🎯',
    contentMode: 'text',
    isDefault: false,
    requiresAuth: true,
    mlEnabled: true // This is where the ML magic happens
  },
  
  [SONET_FEEDS.VIDEO]: {
    id: 'video',
    type: 'feed',
    value: SONET_FEEDS.VIDEO,
    displayName: 'Video',
    description: 'Curated video content feed',
    icon: '🎬',
    contentMode: 'video',
    isDefault: false,
    requiresAuth: false,
    mlEnabled: true // Video ranking and discovery
  }
}

export function getFeedDefinition(feedId: string): SonetFeedDefinition | undefined {
  return SONET_FEED_DEFINITIONS[feedId]
}

export function getDefaultFeeds(): SonetFeedDefinition[] {
  return Object.values(SONET_FEED_DEFINITIONS).filter(feed => feed.isDefault)
}

export function getMLEnabledFeeds(): SonetFeedDefinition[] {
  return Object.values(SONET_FEED_DEFINITIONS).filter(feed => feed.mlEnabled)
}

export function getFeedsForUser(hasAuth: boolean): SonetFeedDefinition[] {
  return Object.values(SONET_FEED_DEFINITIONS).filter(feed => 
    !feed.requiresAuth || hasAuth
  )
}