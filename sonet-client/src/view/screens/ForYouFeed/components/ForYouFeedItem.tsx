// For You Feed Item - ML-powered post with insights and engagement tracking
import React, {useCallback, useState} from 'react'
import {View, Text, StyleSheet, TouchableOpacity, Animated} from 'react-native'
import {useLingui} from '@lingui/react'
import {msg} from '@lingui/macro'

import {type ForYouFeedItem as ForYouFeedItemType} from '#/state/queries/for-you-feed'
import {Post} from '#/view/com/post/Post'
import {MLInsightsOverlay} from './MLInsightsOverlay'
import {EngagementTracker} from './EngagementTracker'

interface ForYouFeedItemProps {
  item: ForYouFeedItemType
  onPress: () => void
  onInteraction: (interaction: any) => void
  showMLInsights: boolean
}

export function ForYouFeedItem({
  item,
  onPress,
  onInteraction,
  showMLInsights
}: ForYouFeedItemProps) {
  const {_} = useLingui()
  const [showInsights, setShowInsights] = useState(false)
  const [engagementStartTime] = useState(Date.now())

  // Handle post interactions for ML training
  const handleInteraction = useCallback((interactionType: string) => {
    const interaction = {
      item: item.post.uri,
      event: `sonet.feed.defs#interaction${interactionType}`,
      feedContext: 'for-you',
      reqId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      metadata: {
        ranking_score: item.ranking.score,
        ranking_factors: item.ranking.factors,
        personalization_reasons: item.ranking.personalization,
        engagement_duration: Date.now() - engagementStartTime,
        ml_insights: item.mlInsights
      }
    }

    onInteraction(interaction)
  }, [item, onInteraction, engagementStartTime])

  // Handle post press
  const handlePostPress = useCallback(() => {
    onPress()
  }, [onPress])

  // Handle insights toggle
  const handleInsightsToggle = useCallback(() => {
    setShowInsights(!showInsights)
  }, [showInsights])

  return (
    <View style={styles.container}>
      {/* ML Ranking Badge */}
      <View style={styles.rankingBadge}>
        <Text style={styles.rankingScore}>
          {Math.round(item.ranking.score * 100)}
        </Text>
        <Text style={styles.rankingLabel}>
          {_(msg`Score`)}
        </Text>
      </View>

      {/* Main Post Content */}
      <View style={styles.postContainer}>
        <Post
          post={item.post}
          onPress={handlePostPress}
          onInteraction={handleInteraction}
          showMLInsights={showMLInsights}
        />
      </View>

      {/* ML Insights Overlay */}
      {showMLInsights && (
        <MLInsightsOverlay
          ranking={item.ranking}
          mlInsights={item.mlInsights}
          onToggle={handleInsightsToggle}
          visible={showInsights}
        />
      )}

      {/* Engagement Tracking */}
      <EngagementTracker
        postId={item.post.uri}
        onInteraction={handleInteraction}
        startTime={engagementStartTime}
      />

      {/* Personalization Reasons */}
      {item.ranking.personalization.length > 0 && (
        <View style={styles.personalizationReasons}>
          <Text style={styles.reasonsTitle}>
            {_(msg`Why you'll like this:`)}
          </Text>
          <View style={styles.reasonsList}>
            {item.ranking.personalization.slice(0, 2).map((reason, index) => (
              <View key={index} style={styles.reasonItem}>
                <Text style={styles.reasonText}>
                  {reason}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Ranking Factors Visualization */}
      <View style={styles.rankingFactors}>
        <Text style={styles.factorsTitle}>
          {_(msg`Content factors:`)}
        </Text>
        <View style={styles.factorsGrid}>
          {Object.entries(item.ranking.factors).slice(0, 4).map(([factor, value]) => (
            <View key={factor} style={styles.factorItem}>
              <Text style={styles.factorName}>
                {factor.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Text>
              <View style={styles.factorBar}>
                <Animated.View 
                  style={[
                    styles.factorBarFill, 
                    {width: `${Math.min(100, Math.max(0, (value as number) * 100))}%`}
                  ]} 
                />
              </View>
              <Text style={styles.factorValue}>
                {Math.round((value as number) * 100)}%
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    paddingVertical: 16
  },
  rankingBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    zIndex: 10
  },
  rankingScore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff'
  },
  rankingLabel: {
    fontSize: 10,
    color: '#fff',
    opacity: 0.8
  },
  postContainer: {
    paddingHorizontal: 16
  },
  personalizationReasons: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7'
  },
  reasonsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8
  },
  reasonsList: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  reasonItem: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 4
  },
  reasonText: {
    fontSize: 12,
    color: '#666'
  },
  rankingFactors: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7'
  },
  factorsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8
  },
  factorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  factorItem: {
    width: '48%',
    marginBottom: 8
  },
  factorName: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
    textAlign: 'center'
  },
  factorBar: {
    height: 4,
    backgroundColor: '#F2F2F7',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 2
  },
  factorBarFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2
  },
  factorValue: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center'
  }
})