import React from 'react'
import {View} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {USE_SONET_MESSAGING, USE_SONET_E2E_ENCRYPTION, USE_SONET_REALTIME} from '#/env'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {Text} from '#/components/Typography'

interface MigrationFeature {
  name: string
  enabled: boolean
  description: string
}

export function MigrationStatus() {
  const {_} = useLingui()
  const t = useTheme()

  const features: MigrationFeature[] = [
    {
      name: 'Sonet Messaging',
      enabled: USE_SONET_MESSAGING,
      description: 'Use Sonet messaging APIs instead of AT Protocol',
    },
    {
      name: 'E2E Encryption',
      enabled: USE_SONET_E2E_ENCRYPTION,
      description: 'Enable military-grade end-to-end encryption',
    },
    {
      name: 'Real-time Messaging',
      enabled: USE_SONET_REALTIME,
      description: 'Use Sonet WebSocket connections for real-time messaging',
    },
  ]

  const enabledCount = features.filter(f => f.enabled).length
  const totalCount = features.length

  return (
    <View style={[a.p_4, a.border, a.rounded_md, t.atoms.bg_contrast_25, t.atoms.border_contrast_low]}>
      <Text style={[a.text_lg, a.font_bold, t.atoms.text, a.mb_2]}>
        <Trans>Migration Status</Trans>
      </Text>
      
      <Text style={[a.text_sm, t.atoms.text_contrast_medium, a.mb_4]}>
        <Trans>
          {enabledCount} of {totalCount} Sonet features enabled
        </Trans>
      </Text>

      <View style={[a.gap_2]}>
        {features.map((feature, index) => (
          <View key={index} style={[a.flex_row, a.items_center, a.justify_between, a.p_2, a.rounded_sm, t.atoms.bg_contrast_50]}>
            <View style={[a.flex_1]}>
              <Text style={[a.font_medium, t.atoms.text]}>
                {feature.name}
              </Text>
              <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                {feature.description}
              </Text>
            </View>
            
            <View style={[
              a.w_3, 
              a.h_3, 
              a.rounded_full, 
              feature.enabled ? t.atoms.bg_positive : t.atoms.bg_negative
            ]} />
          </View>
        ))}
      </View>

      {enabledCount === 0 && (
        <View style={[a.mt_4, a.p_3, a.rounded_sm, t.atoms.bg_warning_25, t.atoms.border_warning]}>
          <Text style={[a.text_sm, t.atoms.text_warning, a.font_medium]}>
            <Trans>All Sonet features are disabled. Using AT Protocol messaging.</Trans>
          </Text>
        </View>
      )}

      {enabledCount === totalCount && (
        <View style={[a.mt_4, a.p_3, a.rounded_sm, t.atoms.bg_positive_25, t.atoms.border_positive]}>
          <Text style={[a.text_sm, t.atoms.text_positive, a.font_medium]}>
            <Trans>All Sonet features are enabled! Using Sonet messaging with E2E encryption.</Trans>
          </Text>
        </View>
      )}

      <View style={[a.mt_4, a.gap_2]}>
        <Button
          variant="solid"
          color="primary"
          size="small"
          onPress={() => {
            // This would typically open a settings screen
            console.log('Open migration settings')
          }}>
          <ButtonText>
            <Trans>Migration Settings</Trans>
          </ButtonText>
        </Button>
        
        <Button
          variant="ghost"
          color="secondary"
          size="small"
          onPress={() => {
            // This would typically show migration documentation
            console.log('Show migration docs')
          }}>
          <ButtonText>
            <Trans>Learn More</Trans>
          </ButtonText>
        </Button>
      </View>
    </View>
  )
}

// Hook to check if migration is complete
export function useMigrationStatus() {
  const isMessagingEnabled = USE_SONET_MESSAGING
  const isE2EEnabled = USE_SONET_E2E_ENCRYPTION
  const isRealtimeEnabled = USE_SONET_REALTIME

  const isComplete = isMessagingEnabled && isE2EEnabled && isRealtimeEnabled
  const isPartial = isMessagingEnabled || isE2EEnabled || isRealtimeEnabled
  const isDisabled = !isMessagingEnabled && !isE2EEnabled && !isRealtimeEnabled

  return {
    isComplete,
    isPartial,
    isDisabled,
    isMessagingEnabled,
    isE2EEnabled,
    isRealtimeEnabled,
  }
}

// Component to show migration progress
export function MigrationProgress() {
  const {_} = useLingui()
  const t = useTheme()
  const status = useMigrationStatus()

  const getProgressPercentage = () => {
    let count = 0
    if (status.isMessagingEnabled) count++
    if (status.isE2EEnabled) count++
    if (status.isRealtimeEnabled) count++
    return (count / 3) * 100
  }

  const getStatusColor = () => {
    if (status.isComplete) return t.atoms.text_positive
    if (status.isPartial) return t.atoms.text_warning
    return t.atoms.text_negative
  }

  const getStatusText = () => {
    if (status.isComplete) return _(msg`Complete`)
    if (status.isPartial) return _(msg`In Progress`)
    return _(msg`Not Started`)
  }

  return (
    <View style={[a.p_3, a.border, a.rounded_md, t.atoms.bg_contrast_25, t.atoms.border_contrast_low]}>
      <View style={[a.flex_row, a.items_center, a.justify_between, a.mb_2]}>
        <Text style={[a.font_medium, t.atoms.text]}>
          <Trans>Migration Progress</Trans>
        </Text>
        <Text style={[a.font_medium, getStatusColor()]}>
          {getStatusText()}
        </Text>
      </View>

      <View style={[a.h_2, a.bg_contrast_100, a.rounded_full, a.overflow_hidden, a.mb_2]}>
        <View 
          style={[
            a.h_full, 
            t.atoms.bg_primary, 
            {width: `${getProgressPercentage()}%`}
          ]} 
        />
      </View>

      <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
        <Trans>{Math.round(getProgressPercentage())}% complete</Trans>
      </Text>
    </View>
  )
}