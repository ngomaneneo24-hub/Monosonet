import React, {useState} from 'react'
import {ScrollView, View, Alert} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'

import {useSubscription} from '#/state/subscription'
import {useGate} from '#/lib/statsig/statsig'
import {type CommonNavigatorParams} from '#/lib/routes/types'
import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import * as Layout from '#/components/Layout'
import {Button} from '#/components/Button'
import {SUBSCRIPTION_TIERS, type SubscriptionTier} from '#/types/subscription'
import {PremiumTierCard} from './PremiumTierCard'
import {FeatureComparison} from './FeatureComparison'
import {FOMOTriggers} from './FOMOTriggers'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'Premium'>

export function PremiumScreen({}: Props) {
  const t = useTheme()
  const {_} = useLingui()
  const {currentTier, upgradeSubscription, isLoading} = useSubscription()
  const gate = useGate()
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null)

  // Gate check - only show Premium screen when feature is enabled
  if (!gate('premium_subscriptions')) {
    return (
      <Layout.Screen>
        <Layout.Header.Outer>
          <Layout.Header.BackButton />
          <Layout.Header.Content>
            <Layout.Header.TitleText>
              <Trans>Premium</Trans>
            </Layout.Header.TitleText>
          </Layout.Header.Content>
          <Layout.Header.Slot />
        </Layout.Header.Outer>
        <Layout.Content>
          <View style={[a.p_lg, a.align_center, a.justify_center]}>
            <Text
              style={[
                a.text_lg,
                a.text_center,
                t.atoms.text_contrast_medium,
              ]}>
              <Trans>Premium features are coming soon!</Trans>
            </Text>
          </View>
        </Layout.Content>
      </Layout.Screen>
    )
  }

  const handleUpgrade = async (tier: SubscriptionTier) => {
    if (tier === currentTier) {
      Alert.alert(_(msg`Already Subscribed`), _(msg`You are already subscribed to this tier.`))
      return
    }

    try {
      await upgradeSubscription(tier)
      Alert.alert(
        _(msg`Welcome to ${SUBSCRIPTION_TIERS[tier].name}!`),
        SUBSCRIPTION_TIERS[tier].welcomeMessage,
        [{text: _(msg`Continue`), style: 'default'}]
      )
    } catch (error) {
      Alert.alert(
        _(msg`Upgrade Failed`),
        _(msg`There was an error processing your upgrade. Please try again.`),
        [{text: _(msg`OK`), style: 'default'}]
      )
    }
  }

  const currentTierInfo = SUBSCRIPTION_TIERS[currentTier]

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Premium</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>

      <Layout.Content>
        <ScrollView contentContainerStyle={[a.p_lg, a.gap_xl]}>
          {/* Hero Section */}
          <View style={[a.align_center, a.gap_md]}>
            <Text
              style={[
                a.text_2xl,
                a.font_bold,
                a.text_center,
                t.atoms.text_contrast_high,
              ]}>
              <Trans>Unlock Your Sonet Potential</Trans>
            </Text>
            <Text
              style={[
                a.text_md,
                a.text_center,
                a.leading_relaxed,
                t.atoms.text_contrast_medium,
              ]}>
              <Trans>
                Join thousands of creators who have transformed their social media presence
                with Sonet Premium features.
              </Trans>
            </Text>
          </View>

          {/* Current Tier Status */}
          {currentTier !== 'free' && (
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
                  a.text_md,
                  a.font_bold,
                  a.text_center,
                  t.atoms.text_contrast_high,
                ]}>
                <Trans>Your Current Plan: {currentTierInfo.name}</Trans>
              </Text>
              <Text
                style={[
                  a.text_sm,
                  a.text_center,
                  a.mt_sm,
                  t.atoms.text_contrast_medium,
                ]}>
                {currentTierInfo.welcomeMessage}
              </Text>
            </View>
          )}

          {/* FOMO Triggers */}
          <FOMOTriggers currentTier={currentTier} />

          {/* Subscription Tiers */}
          <View style={[a.gap_md]}>
            <Text
              style={[
                a.text_xl,
                a.font_bold,
                a.text_center,
                t.atoms.text_contrast_high,
              ]}>
              <Trans>Choose Your Plan</Trans>
            </Text>
            
            {Object.values(SUBSCRIPTION_TIERS)
              .filter(tier => tier.id !== 'free')
              .map(tier => (
                <PremiumTierCard
                  key={tier.id}
                  tier={tier}
                  isCurrentTier={tier.id === currentTier}
                  isSelected={selectedTier === tier.id}
                  onSelect={() => setSelectedTier(tier.id)}
                  onUpgrade={() => handleUpgrade(tier.id)}
                  isLoading={isLoading}
                />
              ))}
          </View>

          {/* Feature Comparison */}
          <FeatureComparison currentTier={currentTier} />

          {/* Social Proof */}
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
                a.text_lg,
                a.font_bold,
                a.text_center,
                a.mb_md,
                t.atoms.text_contrast_high,
              ]}>
              <Trans>Join the Elite</Trans>
            </Text>
            <Text
              style={[
                a.text_sm,
                a.text_center,
                a.leading_relaxed,
                t.atoms.text_contrast_medium,
              ]}>
              <Trans>
                Pro users report 200% more engagement. Max users see 300% growth.
                Ultra members shape the future of social media.
              </Trans>
            </Text>
          </View>

          {/* CTA Section */}
          <View style={[a.align_center, a.gap_md]}>
            <Text
              style={[
                a.text_md,
                a.text_center,
                t.atoms.text_contrast_medium,
              ]}>
              <Trans>Ready to transform your social media experience?</Trans>
            </Text>
            <Button
              label={_(msg`Start Free Trial`)}
              size="lg"
              variant="primary"
              onPress={() => {
                const nextTier = currentTier === 'free' ? 'pro' : 
                                currentTier === 'pro' ? 'max' : 'ultra'
                handleUpgrade(nextTier)
              }}
              disabled={isLoading}
            />
          </View>
        </ScrollView>
      </Layout.Content>
    </Layout.Screen>
  )
}