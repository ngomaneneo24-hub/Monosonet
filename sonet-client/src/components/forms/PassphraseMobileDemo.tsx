import React, {useState} from 'react'
import {View, ScrollView} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {PassphraseInput} from './PassphraseInput'

export function PassphraseMobileDemo() {
  const {_} = useLingui()
  const t = useTheme()
  const [passphrase1, setPassphrase1] = useState('')
  const [passphrase2, setPassphrase2] = useState('')
  const [passphrase3, setPassphrase3] = useState('')

  return (
    <ScrollView style={[a.flex_1, a.p_lg]} showsVerticalScrollIndicator={false}>
      <Text style={[a.text_2xl, a.font_bold, a.text_center, a.mb_lg]}>
        <Trans>Mobile Passphrase Field Demo</Trans>
      </Text>
      
      <Text style={[a.text_center, t.atoms.text_contrast_medium, a.mb_xl]}>
        <Trans>
          Test how passphrase fields handle long text on mobile devices. 
          Try typing long passphrases to see how they expand vertically!
        </Trans>
      </Text>

      {/* Short Passphrase */}
      <View style={[a.mb_lg]}>
        <Text style={[a.text_lg, a.font_bold, a.mb_sm]}>
          <Trans>Short Passphrase (Single Line)</Trans>
        </Text>
        <PassphraseInput
          label={_('Short Passphrase')}
          value={passphrase1}
          onChangeText={setPassphrase1}
          showStrengthMeter={true}
          showToggle={true}
          multiline={false}
          numberOfLines={1}
          placeholder={_('Try: "correct horse battery staple"')}
          accessibilityHint={_('Enter a short passphrase to test single line behavior')}
        />
      </View>

      {/* Medium Passphrase */}
      <View style={[a.mb_lg]}>
        <Text style={[a.text_lg, a.font_bold, a.mb_sm]}>
          <Trans>Medium Passphrase (2 Lines)</Trans>
        </Text>
        <PassphraseInput
          label={_('Medium Passphrase')}
          value={passphrase2}
          onChangeText={setPassphrase2}
          showStrengthMeter={true}
          showToggle={true}
          multiline={true}
          numberOfLines={2}
          placeholder={_('Try: "my favorite coffee shop downtown near the park"')}
          accessibilityHint={_('Enter a medium passphrase to test two line behavior')}
        />
      </View>

      {/* Long Passphrase */}
      <View style={[a.mb_lg]}>
        <Text style={[a.text_lg, a.font_bold, a.mb_sm]}>
          <Trans>Long Passphrase (3+ Lines)</Trans>
        </Text>
        <PassphraseInput
          label={_('Long Passphrase')}
          value={passphrase3}
          onChangeText={setPassphrase3}
          showStrengthMeter={true}
          showToggle={true}
          multiline={true}
          numberOfLines={3}
          placeholder={_('Try: "purple elephant dancing in moonlight while eating chocolate ice cream under the stars"')}
          accessibilityHint={_('Enter a long passphrase to test multi-line expansion')}
        />
      </View>

      {/* Mobile Layout Info */}
      <View style={[a.p_md, a.rounded_sm, {backgroundColor: t.atoms.bg_contrast_100}]}>
        <Text style={[a.font_bold, a.mb_sm]}>
          <Trans>Mobile Layout Features:</Trans>
        </Text>
        <View style={[a.gap_xs]}>
          <Text style={[a.text_sm]}>• <Trans>Fields expand vertically as you type</Trans></Text>
          <Text style={[a.text_sm]}>• <Trans>No text overlapping or cutoff</Trans></Text>
          <Text style={[a.text_sm]}>• <Trans>Proper text wrapping on small screens</Trans></Text>
          <Text style={[a.text_sm]}>• <Trans>Minimum height ensures consistent layout</Trans></Text>
          <Text style={[a.text_sm]}>• <Trans>Toggle button stays properly positioned</Trans></Text>
        </View>
      </View>

      {/* Test Instructions */}
      <View style={[a.mt_lg, a.p_md, a.rounded_sm, {backgroundColor: t.atoms.bg_contrast_50}]}>
        <Text style={[a.font_bold, a.mb_sm]}>
          <Trans>Test Instructions:</Trans>
        </Text>
        <Text style={[a.text_sm, a.mb_sm]}>
          <Trans>
            1. Type a short passphrase in the first field - it should stay single line
          </Trans>
        </Text>
        <Text style={[a.text_sm, a.mb_sm]}>
          <Trans>
            2. Type a medium passphrase in the second field - it should expand to 2 lines
          </Trans>
        </Text>
        <Text style={[a.text_sm, a.mb_sm]}>
          <Trans>
            3. Type a very long passphrase in the third field - it should expand to 3+ lines
          </Trans>
        </Text>
        <Text style={[a.text_sm]}>
          <Trans>
            4. Notice how the fields maintain proper spacing and don't overlap
          </Trans>
        </Text>
      </View>
    </ScrollView>
  )
}