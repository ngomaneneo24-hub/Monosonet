import {View} from 'react-native'
import {SonetActorDefs, ModerationDecision} from '@sonet/api'

import {sanitizeDisplayName} from '#/lib/strings/display-names'
import {sanitizeUsername} from '#/lib/strings/usernames'
import {Shadow} from '#/state/cache/types'
import {atoms as a, useBreakpoints, useTheme} from '#/alf'
import {Text} from '#/components/Typography'

export function ProfileHeaderDisplayName({
  profile,
  moderation,
}: {
  profile: Shadow<SonetActorDefs.ProfileViewDetailed>
  moderation: ModerationDecision
}) {
  const t = useTheme()
  const {gtMobile} = useBreakpoints()

  return (
    <View pointerEvents="none">
      <Text
        emoji
        testID="profileHeaderDisplayName"
        style={[
          t.atoms.text,
          gtMobile ? a.text_4xl : a.text_3xl,
          a.self_start,
          a.font_heavy,
        ]}>
        {sanitizeDisplayName(
          profile.displayName || sanitizeUsername(profile.username),
          moderation.ui('displayName'),
        )}
      </Text>
    </View>
  )
}
