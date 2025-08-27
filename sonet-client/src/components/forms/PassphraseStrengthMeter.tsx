import React from 'react'
import {View} from 'react-native'
import {Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'

export type PassphraseStrength = 'weak' | 'fair' | 'good' | 'strong' | 'excellent'

interface PassphraseStrengthMeterProps {
  passphrase: string
  strength: PassphraseStrength
  showDetails?: boolean
}

export function PassphraseStrengthMeter({
  passphrase,
  strength,
  showDetails = true,
}: PassphraseStrengthMeterProps) {
  const {_} = useLingui()
  const t = useTheme()

  if (!passphrase) return null

  const getStrengthColor = () => {
    switch (strength) {
      case 'weak':
        return '#ef4444' // red
      case 'fair':
        return '#f97316' // orange
      case 'good':
        return '#eab308' // yellow
      case 'strong':
        return '#22c55e' // green
      case 'excellent':
        return '#16a34a' // dark green
      default:
        return t.atoms.bg_contrast_200
    }
  }

  const getStrengthText = () => {
    switch (strength) {
      case 'weak':
        return _('Weak')
      case 'fair':
        return _('Fair')
      case 'good':
        return _('Good')
      case 'strong':
        return _('Strong')
      case 'excellent':
        return _('Excellent')
      default:
        return _('Unknown')
    }
  }

  const getStrengthDescription = () => {
    switch (strength) {
      case 'weak':
        return _('Too short or too common')
      case 'fair':
        return _('Meets basic requirements')
      case 'good':
        return _('Good length and variety')
      case 'strong':
        return _('Strong and memorable')
      case 'excellent':
        return _('Excellent security and memorability')
      default:
        return _('Please enter a passphrase')
    }
  }

  const getProgressWidth = () => {
    switch (strength) {
      case 'weak':
        return '20%'
      case 'fair':
        return '40%'
      case 'good':
        return '60%'
      case 'strong':
        return '80%'
      case 'excellent':
        return '100%'
      default:
        return '0%'
    }
  }

  return (
    <View style={[a.mt_sm, a.px_sm]}>
      {/* Strength Bar */}
      <View style={[a.flex_row, a.items_center, a.gap_sm, a.mb_sm]}>
        <View
          style={[
            a.flex_1,
            a.h_2,
            a.rounded_full,
            {backgroundColor: t.atoms.bg_contrast_200},
          ]}>
          <View
            style={[
              a.h_2,
              a.rounded_full,
              {
                backgroundColor: getStrengthColor(),
                width: getProgressWidth(),
              },
            ]}
          />
        </View>
        <Text
          style={[
            a.text_sm,
            a.font_medium,
            {color: getStrengthColor()},
          ]}>
          {getStrengthText()}
        </Text>
      </View>

      {/* Strength Description */}
      <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
        {getStrengthDescription()}
      </Text>

      {/* Detailed Analysis */}
      {showDetails && (
        <View style={[a.mt_sm, a.gap_xs]}>
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            <Trans>Requirements:</Trans>
          </Text>
          <View style={[a.gap_xs]}>
            <RequirementItem
              met={passphrase.length >= 20}
              text={_('At least 20 characters')}
            />
            <RequirementItem
              met={passphrase.trim().split(/\s+/).filter(word => word.length >= 2).length >= 4}
              text={_('At least 4 words')}
            />
            <RequirementItem
              met={new Set(passphrase.toLowerCase().split('')).size >= 8}
              text={_('At least 8 unique characters')}
            />
            <RequirementItem
              met={!isCommonPhrase(passphrase)}
              text={_('Not a common phrase')}
            />
          </View>
        </View>
      )}
    </View>
  )
}

function RequirementItem({met, text}: {met: boolean; text: string}) {
  const t = useTheme()
  
  return (
    <View style={[a.flex_row, a.items_center, a.gap_xs]}>
      <View
        style={[
          a.w_2,
          a.h_2,
          a.rounded_full,
          {
            backgroundColor: met ? '#22c55e' : '#ef4444',
          },
        ]}
      />
      <Text
        style={[
          a.text_xs,
          {
            color: met ? t.atoms.text_contrast_high : t.atoms.text_contrast_medium,
            textDecorationLine: met ? 'none' : 'line-through',
          },
        ]}>
        {text}
      </Text>
    </View>
  )
}

// Helper function to check if a passphrase is common
function isCommonPhrase(passphrase: string): boolean {
  const commonPhrases = [
    'correct horse battery staple',
    'the quick brown fox',
    'twinkle twinkle little star',
    'mary had a little lamb',
    'happy birthday to you',
    'row row row your boat',
    'old macdonald had a farm',
    'itsy bitsy spider',
    'the wheels on the bus',
    'if you are happy and you know it',
    'head shoulders knees and toes',
    'baa baa black sheep',
    'humpty dumpty sat on a wall',
    'jack and jill went up the hill',
    'little miss muffet sat on a tuffet',
    'peter piper picked a peck',
    'sally sells seashells',
    'how much wood could a woodchuck',
    'she sells seashells by the seashore',
  ]
  
  const lowerPassphrase = passphrase.toLowerCase().trim()
  return commonPhrases.includes(lowerPassphrase)
}

// Function to calculate passphrase strength
export function calculatePassphraseStrength(passphrase: string): PassphraseStrength {
  if (!passphrase || passphrase.length < 20) return 'weak'
  
  const words = passphrase.trim().split(/\s+/).filter(word => word.length >= 2)
  const uniqueChars = new Set(passphrase.toLowerCase().split('')).size
  const isCommon = isCommonPhrase(passphrase)
  
  let score = 0
  
  // Length score (0-3 points)
  if (passphrase.length >= 20) score += 1
  if (passphrase.length >= 30) score += 1
  if (passphrase.length >= 40) score += 1
  
  // Word count score (0-2 points)
  if (words.length >= 4) score += 1
  if (words.length >= 6) score += 1
  
  // Character variety score (0-2 points)
  if (uniqueChars >= 8) score += 1
  if (uniqueChars >= 12) score += 1
  
  // Bonus for mixed case and numbers (0-1 point)
  if (/[A-Z]/.test(passphrase) && /[a-z]/.test(passphrase)) score += 1
  
  // Penalty for common phrases
  if (isCommon) score = Math.max(0, score - 2)
  
  // Penalty for repeated patterns
  if (/(.+)\1/.test(passphrase)) score = Math.max(0, score - 1)
  
  // Determine strength based on score
  if (score >= 7) return 'excellent'
  if (score >= 5) return 'strong'
  if (score >= 3) return 'good'
  if (score >= 1) return 'fair'
  return 'weak'
}