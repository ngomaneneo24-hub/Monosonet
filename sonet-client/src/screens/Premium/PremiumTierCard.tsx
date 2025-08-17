import React from 'react'
import {View, Pressable} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {type SubscriptionTierInfo} from '#/types/subscription'
import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {Button} from '#/components/Button'
import {CrownIcon} from '#/components/icons/Crown'
import {StarIcon} from '#/components/icons/StarIcon'
import {GemIcon} from '#/components/icons/Gem'

interface PremiumTierCardProps {
  tier: SubscriptionTierInfo
  isCurrentTier: boolean
  isSelected: boolean
  onSelect: () => void
  onUpgrade: () => void
  isLoading: boolean
}

const TIER_ICONS = {
  pro: CrownIcon,
  max: StarIcon,
  ultra: GemIcon,
}

const TIER_COLORS = {
  pro: '#3B82F6', // Blue
  max: '#F59E0B', // Amber
  ultra: '#8B5CF6', // Purple
}

export function PremiumTierCard({
  tier,
  isCurrentTier,
  isSelected,
  onSelect,
  onUpgrade,
  isLoading,
}: PremiumTierCardProps) {
  const t = useTheme()
  const {_} = useLingui()
  const IconComponent = TIER_ICONS[tier.id as keyof typeof TIER_ICONS]
  const tierColor = TIER_COLORS[tier.id as keyof typeof TIER_COLORS]

  return (
    <Pressable
      onPress={onSelect}
      style={[
        a.p_md,
        a.rounded_md,
        a.border_2,
        isSelected
          ? {borderColor: tierColor}
          : t.atoms.border_contrast_low,
        t.atoms.bg_contrast_25,
        isCurrentTier && t.atoms.bg_contrast_50,
      ]}>
      <View style={[a.gap_md]}>
        {/* Header */}
        <View style={[a.flex_row, a.align_center, a.justify_between]}>
          <View style={[a.flex_row, a.align_center, a.gap_sm]}>
            <IconComponent
              size="md"
              style={{color: tierColor}}
            />
            <View>
              <Text
                style={[
                  a.text_lg,
                  a.font_bold,
                  t.atoms.text_contrast_high,
                ]}>
                {tier.name}
              </Text>
              <Text
                style={[
                  a.text_sm,
                  t.atoms.text_contrast_medium,
                ]}>
                {tier.description}
              </Text>
            </View>
          </View>
          
          <View style={[a.align_end]}>
            <Text
              style={[
                a.text_2xl,
                a.font_bold,
                {color: tierColor},
              ]}>
              ${tier.price}
            </Text>
            <Text
              style={[
                a.text_sm,
                t.atoms.text_contrast_medium,
              ]}>
              /month
            </Text>
          </View>
        </View>

        {/* Limited Availability */}
        {tier.limitedAvailability && (
          <View
            style={[
              a.p_sm,
              a.rounded_sm,
              {backgroundColor: tierColor + '20'},
              {borderColor: tierColor + '40'},
              a.border,
            ]}>
            <Text
              style={[
                a.text_sm,
                a.font_bold,
                a.text_center,
                {color: tierColor},
              ]}>
              {tier.limitedAvailability}
            </Text>
          </View>
        )}

        {/* Key Features */}
        <View style={[a.gap_sm]}>
          <Text
            style={[
              a.text_sm,
              a.font_bold,
              t.atoms.text_contrast_high,
            ]}>
            <Trans>Key Features:</Trans>
          </Text>
          {tier.features.slice(0, 3).map(feature => (
            <View
              key={feature.id}
              style={[a.flex_row, a.align_center, a.gap_sm]}>
              <View
                style={[
                  a.w_2,
                  a.h_2,
                  a.rounded_full,
                  {backgroundColor: tierColor},
                ]} />
              <Text
                style={[
                  a.text_sm,
                  a.flex_1,
                  t.atoms.text_contrast_medium,
                ]}>
                {feature.name}
              </Text>
            </View>
          ))}
          {tier.features.length > 3 && (
            <Text
              style={[
                a.text_sm,
                a.text_center,
                a.mt_sm,
                {color: tierColor},
                a.font_bold,
              ]}>
              +{tier.features.length - 3} more features
            </Text>
          )}
        </View>

        {/* Social Proof */}
        {tier.socialProof.length > 0 && (
          <View
            style={[
              a.p_sm,
              a.rounded_sm,
              t.atoms.bg_contrast_50,
            ]}>
            <Text
              style={[
                a.text_sm,
                a.text_center,
                a.font_bold,
                t.atoms.text_contrast_medium,
              ]}>
              {tier.socialProof[0]}
            </Text>
          </View>
        )}

        {/* Action Button */}
        <Button
          label={
            isCurrentTier
              ? _(msg`Current Plan`)
              : _(msg`Upgrade to ${tier.name}`)
          }
          size="md"
          variant={isCurrentTier ? 'secondary' : 'primary'}
          onPress={onUpgrade}
          disabled={isCurrentTier || isLoading}
          style={[
            isCurrentTier && {backgroundColor: tierColor + '20'},
            isCurrentTier && {borderColor: tierColor},
          ]}
        />

        {/* FOMO Triggers */}
        {tier.fomoTriggers.length > 0 && !isCurrentTier && (
          <View
            style={[
              a.p_sm,
              a.rounded_sm,
              t.atoms.bg_contrast_25,
            ]}>
            <Text
              style={[
                a.text_sm,
                a.text_center,
                a.font_bold,
                {color: tierColor},
              ]}>
              {tier.fomoTriggers[0]}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  )
}