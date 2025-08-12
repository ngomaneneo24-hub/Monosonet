// For You Feed Header - Personalization controls and ML insights
import React from 'react'
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native'
import {useLingui} from '@lingui/react'
import {msg} from '@lingui/macro'

import {useFeedPersonalizationSummary} from '#/state/queries/for-you-feed'
import {CompassIcon, SettingsIcon, BrainIcon} from '#/lib/icons'

interface ForYouFeedHeaderProps {
  onPersonalizationPress: () => void
  showMLInsights: boolean
  onToggleMLInsights: () => void
}

export function ForYouFeedHeader({
  onPersonalizationPress,
  showMLInsights,
  onToggleMLInsights
}: ForYouFeedHeaderProps) {
  const {_} = useLingui()
  const personalization = useFeedPersonalizationSummary()

  return (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <View style={styles.titleSection}>
          <CompassIcon size={24} color="#007AFF" style={styles.titleIcon} />
          <Text style={styles.title}>
            {_(msg`For You`)}
          </Text>
          {personalization && (
            <View style={styles.algorithmBadge}>
              <Text style={styles.algorithmText}>
                {personalization.algorithm}
              </Text>
              <Text style={styles.versionText}>
                v{personalization.version}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.controls}>
          {/* ML Insights Toggle */}
          <TouchableOpacity
            style={[
              styles.controlButton,
              showMLInsights && styles.controlButtonActive
            ]}
            onPress={onToggleMLInsights}
            accessibilityLabel={_(msg`Toggle ML insights`)}
            accessibilityHint={_(msg`Shows why content was recommended`)}
          >
            <BrainIcon 
              size={20} 
              color={showMLInsights ? '#007AFF' : '#666'} 
            />
            <Text style={[
              styles.controlButtonText,
              showMLInsights && styles.controlButtonTextActive
            ]}>
              {_(msg`Insights`)}
            </Text>
          </TouchableOpacity>

          {/* Personalization Settings */}
          <TouchableOpacity
            style={styles.controlButton}
            onPress={onPersonalizationPress}
            accessibilityLabel={_(msg`Personalization settings`)}
            accessibilityHint={_(msg`Configure your feed preferences`)}
          >
            <SettingsIcon size={20} color="#666" />
            <Text style={styles.controlButtonText}>
              {_(msg`Settings`)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Personalization Summary */}
      {personalization && (
        <View style={styles.personalizationSummary}>
          <Text style={styles.summaryTitle}>
            {_(msg`Your feed is personalized based on:`)}
          </Text>
          <View style={styles.factorsList}>
            {Object.entries(personalization.factors || {}).slice(0, 3).map(([factor, value]) => (
              <View key={factor} style={styles.factorItem}>
                <Text style={styles.factorName}>
                  {factor.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Text>
                <View style={styles.factorBar}>
                  <View 
                    style={[
                      styles.factorBarFill, 
                      {width: `${Math.min(100, Math.max(0, (value as number) * 100)}%`}
                    ]} 
                  />
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
    paddingTop: 10,
    paddingBottom: 15
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  titleIcon: {
    marginRight: 8
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginRight: 12
  },
  algorithmBadge: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center'
  },
  algorithmText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase'
  },
  versionText: {
    fontSize: 8,
    color: '#999',
    marginTop: 1
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8
  },
  controlButtonActive: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#007AFF'
  },
  controlButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginLeft: 4
  },
  controlButtonTextActive: {
    color: '#007AFF'
  },
  personalizationSummary: {
    paddingHorizontal: 16,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7'
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8
  },
  factorsList: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  factorItem: {
    flex: 1,
    marginRight: 12
  },
  factorName: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
    textAlign: 'center'
  },
  factorBar: {
    height: 3,
    backgroundColor: '#F2F2F7',
    borderRadius: 2,
    overflow: 'hidden'
  },
  factorBarFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2
  }
})