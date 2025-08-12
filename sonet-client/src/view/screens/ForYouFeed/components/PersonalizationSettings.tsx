// Personalization Settings - Configure feed preferences and ML behavior
import React, {useState, useCallback} from 'react'
import {View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch} from 'react-native'
import {useLingui} from '@lingui/react'
import {msg} from '@lingui/macro'

import {CloseIcon, BrainIcon, SliderIcon, RefreshIcon} from '#/lib/icons'
import {BottomSheet} from '#/view/com/util/BottomSheet'

interface PersonalizationSettingsProps {
  onClose: () => void
}

export function PersonalizationSettings({onClose}: PersonalizationSettingsProps) {
  const {_} = useLingui()
  
  // Personalization preferences state
  const [preferences, setPreferences] = useState({
    contentDiversity: 0.7,
    noveltyPreference: 0.8,
    engagementFocus: 0.9,
    qualityThreshold: 0.6,
    trendingWeight: 0.5,
    personalizationStrength: 0.8
  })

  // Feature toggles
  const [features, setFeatures] = useState({
    mlRanking: true,
    realTimeUpdates: true,
    engagementTracking: true,
    contentFiltering: true,
    diversityBoost: true,
    noveltyBoost: true
  })

  // Content type preferences
  const [contentTypes, setContentTypes] = useState({
    text: true,
    images: true,
    videos: true,
    links: true,
    polls: true,
    threads: true
  })

  // Handle preference change
  const handlePreferenceChange = useCallback((key: string, value: number) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }))
  }, [])

  // Handle feature toggle
  const handleFeatureToggle = useCallback((key: string, value: boolean) => {
    setFeatures(prev => ({
      ...prev,
      [key]: value
    }))
  }, [])

  // Handle content type toggle
  const handleContentTypeToggle = useCallback((key: string, value: boolean) => {
    setContentTypes(prev => ({
      ...prev,
      [key]: value
    }))
  }, [])

  // Save preferences
  const handleSave = useCallback(() => {
    // TODO: Save preferences to server
    console.log('Saving personalization preferences:', {
      preferences,
      features,
      contentTypes
    })
    onClose()
  }, [preferences, features, contentTypes, onClose])

  // Reset to defaults
  const handleReset = useCallback(() => {
    setPreferences({
      contentDiversity: 0.7,
      noveltyPreference: 0.8,
      engagementFocus: 0.9,
      qualityThreshold: 0.6,
      trendingWeight: 0.5,
      personalizationStrength: 0.8
    })
    setFeatures({
      mlRanking: true,
      realTimeUpdates: true,
      engagementTracking: true,
      contentFiltering: true,
      diversityBoost: true,
      noveltyBoost: true
    })
    setContentTypes({
      text: true,
      images: true,
      videos: true,
      links: true,
      polls: true,
      threads: true
    })
  }, [])

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
            {_(msg`Feed Personalization`)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          accessibilityLabel={_(msg`Close personalization settings`)}
        >
          <CloseIcon size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* ML Algorithm Preferences */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {_(msg`ML Algorithm Preferences`)}
            </Text>
            <Text style={styles.sectionDescription}>
              {_(msg`Fine-tune how the AI ranks content for you`)}
            </Text>

            {/* Content Diversity */}
            <View style={styles.preferenceRow}>
              <Text style={styles.preferenceLabel}>
                {_(msg`Content Diversity`)}
              </Text>
              <View style={styles.sliderContainer}>
                <SliderIcon size={20} color="#007AFF" />
                <View style={styles.sliderTrack}>
                  <View 
                    style={[
                      styles.sliderFill, 
                      {width: `${preferences.contentDiversity * 100}%`}
                    ]} 
                  />
                </View>
                <Text style={styles.preferenceValue}>
                  {Math.round(preferences.contentDiversity * 100)}%
                </Text>
              </View>
            </View>

            {/* Novelty Preference */}
            <View style={styles.preferenceRow}>
              <Text style={styles.preferenceLabel}>
                {_(msg`Novelty Preference`)}
              </Text>
              <View style={styles.sliderContainer}>
                <SliderIcon size={20} color="#007AFF" />
                <View style={styles.sliderTrack}>
                  <View 
                    style={[
                      styles.sliderFill, 
                      {width: `${preferences.noveltyPreference * 100}%`}
                    ]} 
                  />
                </View>
                <Text style={styles.preferenceValue}>
                  {Math.round(preferences.noveltyPreference * 100)}%
                </Text>
              </View>
            </View>

            {/* Engagement Focus */}
            <View style={styles.preferenceRow}>
              <Text style={styles.preferenceLabel}>
                {_(msg`Engagement Focus`)}
              </Text>
              <View style={styles.sliderContainer}>
                <SliderIcon size={20} color="#007AFF" />
                <View style={styles.sliderTrack}>
                  <View 
                    style={[
                      styles.sliderFill, 
                      {width: `${preferences.engagementFocus * 100}%`}
                    ]} 
                  />
                </View>
                <Text style={styles.preferenceValue}>
                  {Math.round(preferences.engagementFocus * 100)}%
                </Text>
              </View>
            </View>
          </View>

          {/* Feature Toggles */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {_(msg`ML Features`)}
            </Text>
            <Text style={styles.sectionDescription}>
              {_(msg`Enable or disable specific ML features`)}
            </Text>

            {Object.entries(features).map(([key, value]) => (
              <View key={key} style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </Text>
                <Switch
                  value={value}
                  onValueChange={(newValue) => handleFeatureToggle(key, newValue)}
                  trackColor={{false: '#E5E5E7', true: '#007AFF'}}
                  thumbColor={value ? '#fff' : '#fff'}
                />
              </View>
            ))}
          </View>

          {/* Content Type Preferences */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {_(msg`Content Types`)}
            </Text>
            <Text style={styles.sectionDescription}>
              {_(msg`Choose what types of content to show`)}
            </Text>

            {Object.entries(contentTypes).map(([key, value]) => (
              <View key={key} style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </Text>
                <Switch
                  value={value}
                  onValueChange={(newValue) => handleContentTypeToggle(key, newValue)}
                  trackColor={{false: '#E5E5E7', true: '#007AFF'}}
                  thumbColor={value ? '#fff' : '#fff'}
                />
              </View>
            ))}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={handleReset}
            >
              <RefreshIcon size={16} color="#666" />
              <Text style={styles.resetButtonText}>
                {_(msg`Reset to Defaults`)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>
                {_(msg`Save Preferences`)}
              </Text>
            </TouchableOpacity>
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
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20
  },
  preferenceRow: {
    marginBottom: 16
  },
  preferenceLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 8
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  sliderTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#F2F2F7',
    borderRadius: 2,
    marginHorizontal: 12,
    overflow: 'hidden'
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2
  },
  preferenceValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    minWidth: 30,
    textAlign: 'right'
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8
  },
  toggleLabel: {
    fontSize: 14,
    color: '#000'
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7'
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7'
  },
  resetButtonText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  }
})