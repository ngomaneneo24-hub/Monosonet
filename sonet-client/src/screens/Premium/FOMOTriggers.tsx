import React from 'react'
import {View} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {type SubscriptionTier} from '#/types/subscription'
import {SUBSCRIPTION_TIERS} from '#/types/subscription'
import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {FireIcon} from '#/components/icons/Fire'
import {TrendingUpIcon} from '#/components/icons/TrendingUp'
import {CrownIcon} from '#/components/icons/Crown'

interface FOMOTriggersProps {
  currentTier: SubscriptionTier
}

export function FOMOTriggers({currentTier}: FOMOTriggersProps) {
  const t = useTheme()
  const {_} = useLingui()

  const getFOMOContent = () => {
    switch (currentTier) {
      case 'free':
        return {
          icon: FireIcon,
          title: _(msg`🔥 Limited Time: Join the Creator Revolution!`),
          messages: [
            _(msg`Only 500K Pro spots available globally`),
            _(msg`Get verified 10x faster than free users`),
            _(msg`Join 50K+ creators who upgraded this month`),
          ],
          color: '#EF4444', // Red
        }
      case 'pro':
        return {
          icon: TrendingUpIcon,
          title: _(msg`📈 Level Up: Unlock Business Growth Tools!`),
          messages: [
            _(msg`Max tier: Limited to 100K members`),
            _(msg`Get golden checkmark and elite status`),
            _(msg`Direct access to Neo Qiss monthly Q&A`),
          ],
          color: '#F59E0B', // Amber
        }
      case 'max':
        return {
          icon: CrownIcon,
          title: _(msg`👑 Ultimate: Join the Digital Elite!`),
          messages: [
            _(msg`Only 10,000 Ultra memberships available globally`),
            _(msg`Personal account manager included`),
            _(msg`Monthly 1-on-1 with Neo Qiss`),
          ],
          color: '#8B5CF6', // Purple
        }
      default:
        return null
    }
  }

  const fomoContent = getFOMOContent()
  if (!fomoContent) return null

  const IconComponent = fomoContent.icon

  return (
    <View
      style={[
        a.p_md,
        a.rounded_md,
        a.border_2,
        {borderColor: fomoContent.color},
        {backgroundColor: fomoContent.color + '10'},
      ]}>
      <View style={[a.flex_row, a.align_center, a.gap_sm, a.mb_md]}>
        <IconComponent
          size="md"
          style={{color: fomoContent.color}}
        />
        <Text
          style={[
            a.text_lg,
            a.font_bold,
            a.flex_1,
            {color: fomoContent.color},
          ]}>
          {fomoContent.title}
        </Text>
      </View>

      <View style={[a.gap_sm]}>
        {fomoContent.messages.map((message, index) => (
          <View
            key={index}
            style={[a.flex_row, a.align_center, a.gap_sm]}>
            <View
              style={[
                a.w_2,
                a.h_2,
                a.rounded_full,
                {backgroundColor: fomoContent.color},
              ]} />
            <Text
              style={[
                a.text_sm,
                a.flex_1,
                t.atoms.text_contrast_high,
              ]}>
              {message}
            </Text>
          </View>
        ))}
      </View>

      {/* Social Proof Numbers */}
      <View
        style={[
          a.mt_md,
          a.p_md,
          a.rounded_sm,
          {backgroundColor: fomoContent.color + '20'},
        ]}>
        <Text
          style={[
            a.text_sm,
            a.text_center,
            a.font_bold,
            {color: fomoContent.color},
          ]}>
          {currentTier === 'free' && '500K+ creators upgraded this month'}
          {currentTier === 'pro' && '100K Max members globally'}
          {currentTier === 'max' && '10K Ultra members worldwide'}
        </Text>
      </View>

      {/* Urgency Message */}
      <View
        style={[
          a.mt_md,
          a.p_sm,
          a.rounded_sm,
          t.atoms.bg_contrast_25,
        ]}>
        <Text
          style={[
            a.text_sm,
            a.text_center,
            a.font_bold,
            t.atoms.text_contrast_high,
          ]}>
          {currentTier === 'free' && _(msg`Don't miss out on creator success!`)}
          {currentTier === 'pro' && _(msg`Business tools are waiting for you!`)}
          {currentTier === 'max' && _(msg`Join the digital royalty today!`)}
        </Text>
      </View>
    </View>
  )
}