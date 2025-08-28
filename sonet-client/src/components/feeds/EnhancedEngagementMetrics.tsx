import React, {useCallback} from 'react'
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {Text as TypographyText} from '#/components/Typography'

interface EnhancedEngagementMetricsProps {
  replyCount: number
  likeCount: number
  repostCount: number
  viewCount: number
  onViewReplies?: () => void
  onViewLikes?: () => void
  onViewViews?: () => void
}

export function EnhancedEngagementMetrics({
  replyCount,
  likeCount,
  repostCount,
  viewCount,
  onViewReplies,
  onViewLikes,
  onViewViews,
}: EnhancedEngagementMetricsProps) {
  const t = useTheme()
  const {_} = useLingui()

  const formatCount = useCallback((count: number): string => {
    if (count === 0) return ''
    if (count < 1000) return count.toString()
    if (count < 1000000) return `${(count / 1000).toFixed(1)}K`
    return `${(count / 1000000).toFixed(1)}M`
  }, [])

  const handleViewReplies = useCallback(() => {
    if (replyCount > 0) {
      onViewReplies?.()
    }
  }, [replyCount, onViewReplies])

  const handleViewLikes = useCallback(() => {
    if (likeCount > 0) {
      onViewLikes?.()
    }
  }, [likeCount, onViewLikes])

  const handleViewViews = useCallback(() => {
    if (viewCount > 0) {
      onViewViews?.()
    }
  }, [viewCount, onViewViews])

  const renderMetric = useCallback((
    count: number,
    label: string,
    onPress?: () => void,
    isClickable: boolean = false
  ) => {
    if (count === 0) return null

    const content = (
      <View style={styles.metricContainer}>
        <TypographyText style={[styles.metricCount, t.atoms.text_contrast_medium]}>
          {formatCount(count)}
        </TypographyText>
        <TypographyText style={[styles.metricLabel, t.atoms.text_contrast_medium]}>
          {label}
        </TypographyText>
      </View>
    )

    if (isClickable && onPress) {
      return (
        <Pressable
          style={styles.clickableMetric}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`View ${label}`}
        >
          {content}
        </Pressable>
      )
    }

    return content
  }, [formatCount, t.atoms.text_contrast_medium])

  return (
    <View style={styles.container}>
      {/* Reply Count */}
      {renderMetric(replyCount, 'replies', handleViewReplies, true)}
      
      {/* Like Count */}
      {renderMetric(likeCount, 'likes', handleViewLikes, true)}
      
      {/* Repost Count */}
      {renderMetric(repostCount, 'reposts', undefined, false)}
      
      {/* View Count */}
      {renderMetric(viewCount, 'views', handleViewViews, true)}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  metricContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricCount: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
  },
  metricLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '400',
  },
  clickableMetric: {
    // Web hover effect
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'opacity 0.2s ease',
      ':hover': {
        opacity: 0.7,
      },
    }),
  },
})