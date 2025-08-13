// ML Insights Panel - Shows why content was recommended
import React from 'react'
import {View, Text, StyleSheet, TouchableOpacity, ScrollView} from 'react-native'
import {useLingui} from '@lingui/react'
import {msg} from '@lingui/macro'

import {type ForYouFeedItem as ForYouFeedItemType} from '#/state/queries/for-you-feed'
import {CloseIcon, BrainIcon, TrendingIcon, HeartIcon, SparklesIcon} from '#/lib/icons'
import {BottomSheet} from '#/view/com/util/BottomSheet'

interface MLInsightsPanelProps {
  note: ForYouFeedItemType
  onClose: () => void
}

export function MLInsightsPanel({note, onClose}: MLInsightsPanelProps) {
  const {_} = useLingui()

  const getInsightIcon = (factor: string) => {
    if (factor.includes('engagement')) return <HeartIcon size={16} color="#FF3B30" />
    if (factor.includes('trending')) return <TrendingIcon size={16} color="#FF9500" />
    if (factor.includes('quality')) return <SparklesIcon size={16} color="#007AFF" />
    return <BrainIcon size={16} color="#34C759" />
  }

  const getInsightColor = (factor: string) => {
    if (factor.includes('engagement')) return '#FF3B30'
    if (factor.includes('trending')) return '#FF9500'
    if (factor.includes('quality')) return '#007AFF'
    return '#34C759'
  }

  return (
    <BottomSheet
      isVisible={true}
      onClose={onClose}
      snapPoint="LARGE"
      showBackdrop={true}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <BrainIcon size={24} color="#007AFF" />
          <Text style={styles.title}>
            {_(msg`Why This Was Recommended`)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          accessibilityLabel={_(msg`Close insights panel`)}
        >
          <CloseIcon size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Overall Score */}
          <View style={styles.scoreSection}>
            <Text style={styles.sectionTitle}>
              {_(msg`Overall Recommendation Score`)}
            </Text>
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreValue}>
                {Math.round(note.ranking.score * 100)}
              </Text>
              <Text style={styles.scoreLabel}>
                {_(msg`out of 100`)}
              </Text>
            </View>
            <Text style={styles.scoreDescription}>
              {note.ranking.score >= 0.8 
                ? _(msg`This content is highly recommended for you!`)
                : note.ranking.score >= 0.6
                ? _(msg`This content should be interesting to you.`)
                : _(msg`This content might be relevant to your interests.`)
              }
            </Text>
          </View>

          {/* Ranking Factors */}
          <View style={styles.factorsSection}>
            <Text style={styles.sectionTitle}>
              {_(msg`Content Ranking Factors`)}
            </Text>
            <View style={styles.factorsList}>
              {Object.entries(note.ranking.factors)
                .sort(([,a], [,b]) => (b as number) - (a as number))
                .map(([factor, value]) => (
                  <View key={factor} style={styles.factorRow}>
                    <View style={styles.factorInfo}>
                      {getInsightIcon(factor)}
                      <Text style={styles.factorName}>
                        {factor.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Text>
                    </View>
                    <View style={styles.factorValue}>
                      <Text style={styles.factorScore}>
                        {Math.round((value as number) * 100)}%
                      </Text>
                      <View style={styles.factorBar}>
                        <View 
                          style={[
                            styles.factorBarFill, 
                            {
                              width: `${Math.min(100, Math.max(0, (value as number) * 100))}%`,
                              backgroundColor: getInsightColor(factor)
                            }
                          ]} 
                        />
                      </View>
                    </View>
                  </View>
                ))}
            </View>
          </View>

          {/* Personalization Reasons */}
          {note.ranking.personalization.length > 0 && (
            <View style={styles.reasonsSection}>
              <Text style={styles.sectionTitle}>
                {_(msg`Personalization Reasons`)}
              </Text>
              <View style={styles.reasonsList}>
                {note.ranking.personalization.map((reason, index) => (
                  <View key={index} style={styles.reasonItem}>
                    <View style={styles.reasonBullet} />
                    <Text style={styles.reasonText}>
                      {reason}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ML Insights */}
          {note.mlInsights && (
            <View style={styles.insightsSection}>
              <Text style={styles.sectionTitle}>
                {_(msg`Machine Learning Insights`)}
              </Text>
              <View style={styles.insightsGrid}>
                <View style={styles.insightCard}>
                  <Text style={styles.insightLabel}>
                    {_(msg`Engagement Prediction`)}
                  </Text>
                  <Text style={styles.insightValue}>
                    {Math.round(note.mlInsights.engagementPrediction * 100)}%
                  </Text>
                  <Text style={styles.insightDescription}>
                    {_(msg`Likelihood you'll engage`)}
                  </Text>
                </View>
                <View style={styles.insightCard}>
                  <Text style={styles.insightLabel}>
                    {_(msg`Content Quality`)}
                  </Text>
                  <Text style={styles.insightValue}>
                    {Math.round(note.mlInsights.contentQuality * 100)}%
                  </Text>
                  <Text style={styles.insightDescription}>
                    {_(msg`Overall content quality`)}
                  </Text>
                </View>
                <View style={styles.insightCard}>
                  <Text style={styles.insightLabel}>
                    {_(msg`Diversity Score`)}
                  </Text>
                  <Text style={styles.insightValue}>
                    {Math.round(note.mlInsights.diversityScore * 100)}%
                  </Text>
                  <Text style={styles.insightDescription}>
                    {_(msg`Content diversity`)}
                  </Text>
                </View>
                <View style={styles.insightCard}>
                  <Text style={styles.insightLabel}>
                    {_(msg`Novelty Score`)}
                  </Text>
                  <Text style={styles.insightValue}>
                    {Math.round(note.mlInsights.noveltyScore * 100)}%
                  </Text>
                  <Text style={styles.insightDescription}>
                    {_(msg`Content freshness`)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Algorithm Info */}
          <View style={styles.algorithmSection}>
            <Text style={styles.sectionTitle}>
              {_(msg`Algorithm Information`)}
            </Text>
            <View style={styles.algorithmInfo}>
              <Text style={styles.algorithmText}>
                {_(msg`This recommendation was generated using advanced machine learning algorithms that analyze your interests, engagement patterns, and content preferences.`)}
              </Text>
              <Text style={styles.algorithmText}>
                {_(msg`The more you interact with content, the better your recommendations become!`)}
              </Text>
            </View>
          </View>
        </ScrollView>
      </BottomSheet>
    )
  }

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7'
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginLeft: 12
  },
  closeButton: {
    padding: 4
  },
  content: {
    padding: 20
  },
  scoreSection: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#007AFF'
  },
  scoreLabel: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8
  },
  scoreDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20
  },
  factorsSection: {
    marginBottom: 24
  },
  factorsList: {
    gap: 12
  },
  factorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  factorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  factorName: {
    fontSize: 14,
    color: '#000',
    marginLeft: 8,
    flex: 1
  },
  factorValue: {
    alignItems: 'flex-end',
    minWidth: 60
  },
  factorScore: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4
  },
  factorBar: {
    width: 40,
    height: 4,
    backgroundColor: '#F2F2F7',
    borderRadius: 2,
    overflow: 'hidden'
  },
  factorBarFill: {
    height: '100%',
    borderRadius: 2
  },
  reasonsSection: {
    marginBottom: 24
  },
  reasonsList: {
    gap: 8
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  reasonBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#007AFF',
    marginTop: 6,
    marginRight: 12
  },
  reasonText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    flex: 1
  },
  insightsSection: {
    marginBottom: 24
  },
  insightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  insightCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    alignItems: 'center'
  },
  insightLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
    marginBottom: 4
  },
  insightValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4
  },
  insightDescription: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center'
  },
  algorithmSection: {
    marginBottom: 24
  },
  algorithmInfo: {
    gap: 12
  },
  algorithmText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20
  }
})