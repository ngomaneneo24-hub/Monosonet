import React, {useCallback} from 'react'
import {TouchableOpacity, View} from 'react-native'
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useNavigation} from '@react-navigation/native'

import {BACK_HITSLOP} from '#/lib/constants'
import {type NavigationProp} from '#/lib/routes/types'
import {isWeb} from '#/platform/detection'
import {atoms as a, useBreakpoints, useTheme} from '#/alf'
import {Text} from '#/components/Typography'

const PFP_SIZE = isWeb ? 40 : 34

// Sonet profile interface
interface SonetProfile {
  id: string
  username: string
  displayName?: string
  avatar?: string
  isVerified?: boolean
  isBlocked?: boolean
  isBlocking?: boolean
}

// Sonet moderation interface
interface SonetModeration {
  isBlocked: boolean
  isBlocking: boolean
  blockReason?: string
}

export let SonetMessagesListHeader = ({
  profile,
  moderation,
}: {
  profile?: SonetProfile
  moderation?: SonetModeration
}): React.ReactNode => {
  const t = useTheme()
  const {_} = useLingui()
  const {gtTablet} = useBreakpoints()
  const navigation = useNavigation<NavigationProp>()

  const onPressBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack()
    } else {
      navigation.navigate('Messages', {})
    }
  }, [navigation])

  return (
    <View
      style={[
        t.atoms.bg,
        t.atoms.border_contrast_low,
        a.border_b,
        a.flex_row,
        a.align_start,
        a.gap_sm,
        gtTablet ? a.pl_lg : a.pl_xl,
        a.pr_lg,
        a.py_sm,
      ]}>
      <TouchableOpacity
        testID="conversationHeaderBackBtn"
        onPress={onPressBack}
        hitSlop={BACK_HITSLOP}
        style={{width: 30, height: 30, marginTop: isWeb ? 6 : 4}}
        accessibilityRole="button"
        accessibilityLabel={_(msg`Back`)}
        accessibilityHint="">
        <FontAwesomeIcon
          size={18}
          icon="angle-left"
          style={{
            marginTop: 6,
          }}
          color={t.atoms.text.color}
        />
      </TouchableOpacity>

      {profile ? (
        <HeaderReady
          profile={profile}
          moderation={moderation}
        />
      ) : (
        <View style={[a.flex_1, a.justify_center, a.py_sm]}>
          <Text style={[a.text_lg, a.font_bold, t.atoms.text]}>
            {_(msg`Conversation`)}
          </Text>
        </View>
      )}
    </View>
  )
}

function HeaderReady({
  profile,
  moderation,
}: {
  profile: SonetProfile
  moderation?: SonetModeration
}) {
  const t = useTheme()
  const {_} = useLingui()

  const displayName = profile.displayName || profile.username
  const isBlocked = moderation?.isBlocked || profile.isBlocked
  const isBlocking = moderation?.isBlocking || profile.isBlocking

  return (
    <View style={[a.flex_1, a.flex_row, a.items_center, a.gap_sm]}>
      {/* Avatar */}
      <View style={[a.relative]}>
        <View
          style={[
            a.w_8,
            a.h_8,
            a.rounded_full,
            a.overflow_hidden,
            a.border,
            t.atoms.border_contrast_25,
          ]}>
          {profile.avatar ? (
            <img
              src={profile.avatar}
              alt={displayName}
              style={{width: PFP_SIZE, height: PFP_SIZE}}
            />
          ) : (
            <View
              style={[
                a.w_full,
                a.h_full,
                t.atoms.bg_contrast_25,
                a.items_center,
                a.justify_center,
              ]}>
              <Text style={[a.text_lg, t.atoms.text_contrast_medium]}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        
        {/* Verification badge */}
        {profile.isVerified && (
          <View
            style={[
              a.absolute,
              a.bottom_0,
              a.right_0,
              a.w_4,
              a.h_4,
              a.rounded_full,
              t.atoms.bg_positive,
              a.border,
              a.border_2,
              t.atoms.border,
              a.items_center,
              a.justify_center,
            ]}>
            <Text style={[a.text_xs, t.atoms.text_on_positive]}>✓</Text>
          </View>
        )}
      </View>

      {/* Profile Info */}
      <View style={[a.flex_1, a.min_w_0]}>
        <View style={[a.flex_row, a.items_center, a.gap_xs]}>
          <Text
            style={[
              a.text_lg,
              a.font_bold,
              t.atoms.text,
              a.flex_1,
            ]}
            numberOfLines={1}>
            {displayName}
          </Text>
        </View>
        
        <Text
          style={[
            a.text_sm,
            t.atoms.text_contrast_medium,
          ]}
          numberOfLines={1}>
          @{profile.username}
        </Text>
      </View>

      {/* Status Indicators */}
      <View style={[a.flex_row, a.items_center, a.gap_xs]}>
        {/* Blocked indicator */}
        {isBlocked && (
          <View
            style={[
              a.px_sm,
              a.py_xs,
              a.rounded_sm,
              t.atoms.bg_negative_25,
            ]}>
            <Text style={[a.text_xs, t.atoms.text_negative]}>
              {_(msg`Blocked`)}
            </Text>
          </View>
        )}
        
        {/* Blocking indicator */}
        {isBlocking && (
          <View
            style={[
              a.px_sm,
              a.py_xs,
              a.rounded_sm,
              t.atoms.bg_warning_25,
            ]}>
            <Text style={[a.text_xs, t.atoms.text_warning]}>
              {_(msg`Blocking`)}
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}