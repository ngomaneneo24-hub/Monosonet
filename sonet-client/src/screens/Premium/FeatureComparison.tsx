import React from 'react'
import {View, ScrollView} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {type SubscriptionTier} from '#/types/subscription'
import {SUBSCRIPTION_TIERS} from '#/types/subscription'
import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {CheckIcon} from '#/components/icons/CheckIcon'
import {XIcon} from '#/components/icons/X'
import {StarIcon} from '#/components/icons/StarIcon'

interface FeatureComparisonProps {
  currentTier: SubscriptionTier
}

const FEATURE_CATEGORIES = [
  {
    name: 'Creator Tools',
    features: [
      'Advanced Analytics',
      'Custom App Icons',
      'Verification',
      'Custom Reactions',
      'Generic Feed Toggle',
    ],
  },
  {
    name: 'Media & Content',
    features: [
      '4K Image Uploads',
      '10-Minute Videos',
      'Custom Thumbnails',
      'GIF/Sticker Uploads',
      'Bulk Upload Tools',
    ],
  },
  {
    name: 'Business Features',
    features: [
      'Business Analytics',
      'Promoted Credits',
      'Lead Generation',
      'Multi-Account Management',
      'Revenue Sharing',
    ],
  },
  {
    name: 'Elite Status',
    features: [
      'Blue Checkmark',
      'Golden Checkmark',
      'Platinum Checkmark',
      'Priority Search',
      'Exclusive Community Access',
    ],
  },
  {
    name: 'Premium Support',
    features: [
      'Standard Support',
      'Priority Support',
      'Direct Neo Qiss Access',
      'Personal Account Manager',
      'Monthly 1-on-1 Sessions',
    ],
  },
]

export function FeatureComparison({currentTier}: FeatureComparisonProps) {
  const t = useTheme()
  const {_} = useLingui()

  const getFeatureAvailability = (featureName: string, tier: SubscriptionTier): boolean => {
    const tierInfo = SUBSCRIPTION_TIERS[tier]
    return tierInfo.features.some(f => 
      f.name.toLowerCase().includes(featureName.toLowerCase()) ||
      featureName.toLowerCase().includes(f.name.toLowerCase())
    )
  }

  const getTierColor = (tier: SubscriptionTier): string => {
    switch (tier) {
      case 'pro': return '#3B82F6'
      case 'max': return '#F59E0B'
      case 'ultra': return '#8B5CF6'
      default: return '#6B7280'
    }
  }

  return (
    <View style={[a.gap_md]}>
      <Text
        style={[
          a.text_xl,
          a.font_bold,
          a.text_center,
          t.atoms.text_contrast_high,
        ]}>
        <Trans>Feature Comparison</Trans>
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={[a.gap_sm]}>
          {/* Header Row */}
          <View style={[a.flex_row, a.gap_sm]}>
            <View style={[a.w_32, a.p_sm]}>
              <Text
                style={[
                  a.text_sm,
                  a.font_bold,
                  a.text_center,
                  t.atoms.text_contrast_high,
                ]}>
                <Trans>Features</Trans>
              </Text>
            </View>
            {Object.values(SUBSCRIPTION_TIERS)
              .filter(tier => tier.id !== 'free')
              .map(tier => (
                <View
                  key={tier.id}
                  style={[
                    a.w_24,
                    a.p_sm,
                    a.align_center,
                    a.border,
                    {borderColor: getTierColor(tier.id)},
                    a.rounded_sm,
                  ]}>
                  <Text
                    style={[
                      a.text_sm,
                      a.font_bold,
                      a.text_center,
                      {color: getTierColor(tier.id)},
                    ]}>
                    {tier.name}
                  </Text>
                  <Text
                    style={[
                      a.text_xs,
                      a.text_center,
                      a.mt_xs,
                      t.atoms.text_contrast_medium,
                    ]}>
                    ${tier.price}/mo
                  </Text>
                </View>
              ))}
          </View>

          {/* Feature Rows */}
          {FEATURE_CATEGORIES.map(category => (
            <View key={category.name} style={[a.gap_sm]}>
              {/* Category Header */}
              <View style={[a.p_sm, a.bg_contrast_25, a.rounded_sm]}>
                <Text
                  style={[
                    a.text_sm,
                    a.font_bold,
                    t.atoms.text_contrast_high,
                  ]}>
                  {category.name}
                </Text>
              </View>

              {/* Features in Category */}
              {category.features.map(feature => (
                <View key={feature} style={[a.flex_row, a.gap_sm]}>
                  <View style={[a.w_32, a.p_sm, a.justify_center]}>
                    <Text
                      style={[
                        a.text_sm,
                        t.atoms.text_contrast_medium,
                      ]}>
                      {feature}
                    </Text>
                  </View>
                  {Object.values(SUBSCRIPTION_TIERS)
                    .filter(tier => tier.id !== 'free')
                    .map(tier => (
                      <View
                        key={tier.id}
                        style={[
                          a.w_24,
                          a.p_sm,
                          a.align_center,
                          a.justify_center,
                        ]}>
                        {getFeatureAvailability(feature, tier.id) ? (
                          <CheckIcon
                            size="sm"
                            style={{color: getTierColor(tier.id)}}
                          />
                        ) : (
                          <XIcon
                            size="sm"
                            style={{color: t.palette.negative_500}}
                          />
                        )}
                      </View>
                    ))}
                </View>
              ))}
            </View>
          ))}

          {/* Current Tier Indicator */}
          <View style={[a.flex_row, a.gap_sm, a.mt_md]}>
            <View style={[a.w_32, a.p_sm]} />
            {Object.values(SUBSCRIPTION_TIERS)
              .filter(tier => tier.id !== 'free')
              .map(tier => (
                <View
                  key={tier.id}
                  style={[
                    a.w_24,
                    a.p_sm,
                    a.align_center,
                  ]}>
                  {tier.id === currentTier && (
                    <View
                      style={[
                        a.flex_row,
                        a.align_center,
                        a.gap_xs,
                        a.p_sm,
                        a.rounded_sm,
                        {backgroundColor: getTierColor(tier.id) + '20'},
                      ]}>
                      <StarIcon
                        size="sm"
                        style={{color: getTierColor(tier.id)}}
                      />
                      <Text
                        style={[
                          a.text_xs,
                          a.font_bold,
                          {color: getTierColor(tier.id)},
                        ]}>
                        <Trans>Current</Trans>
                      </Text>
                    </View>
                  )}
                </View>
              ))}
          </View>
        </View>
      </ScrollView>

      {/* Upgrade Path */}
      <View
        style={[
          a.p_md,
          a.rounded_md,
          a.border,
          t.atoms.border_contrast_low,
          t.atoms.bg_contrast_25,
        ]}>
        <Text
          style={[
            a.text_sm,
            a.font_bold,
            a.text_center,
            a.mb_sm,
            t.atoms.text_contrast_high,
          ]}>
          <Trans>Upgrade Path</Trans>
        </Text>
        <Text
          style={[
            a.text_sm,
            a.text_center,
            a.leading_relaxed,
            t.atoms.text_contrast_medium,
          ]}>
          {currentTier === 'free' && 'Free → Pro → Max → Ultra'}
          {currentTier === 'pro' && 'Pro → Max → Ultra'}
          {currentTier === 'max' && 'Max → Ultra'}
          {currentTier === 'ultra' && 'You have reached the ultimate tier!'}
        </Text>
      </View>
    </View>
  )
}