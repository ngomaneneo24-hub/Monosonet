import React, {useState} from 'react'
import {View} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import * as TextField from '#/components/forms/TextField'
import {PassphraseStrengthMeter, calculatePassphraseStrength} from './PassphraseStrengthMeter'
import {PassphraseToggleButton} from './PassphraseToggleButton'

export function PassphraseDemo() {
  const {_} = useLingui()
  const t = useTheme()
  const [passphrase, setPassphrase] = useState('')
  const [isVisible, setIsVisible] = useState(true)

  const strength = calculatePassphraseStrength(passphrase)

  return (
    <View style={[a.p_lg, a.gap_lg]}>
      <Text style={[a.text_2xl, a.font_bold, a.text_center]}>
        <Trans>Passphrase Strength Demo</Trans>
      </Text>
      
      <Text style={[a.text_center, t.atoms.text_contrast_medium]}>
        <Trans>
          Type a passphrase below to see the strength meter in action. 
          Try different lengths and word combinations!
        </Trans>
      </Text>

      <View>
        <TextField.LabelText>
          <Trans>Test Passphrase</Trans>
        </TextField.LabelText>
        <TextField.Root>
          <TextField.Input
            label={_('Enter a passphrase to test')}
            value={passphrase}
            onChangeText={setPassphrase}
            secureTextEntry={!isVisible}
            multiline
            numberOfLines={3}
            style={[a.min_h_20]}
          />
          <PassphraseToggleButton
            isVisible={isVisible}
            onToggle={() => setIsVisible(!isVisible)}
            size="lg"
          />
        </TextField.Root>
      </View>

      {/* Strength Meter */}
      {passphrase && (
        <PassphraseStrengthMeter
          passphrase={passphrase}
          strength={strength}
          showDetails={true}
        />
      )}

      {/* Example Passphrases */}
      <View style={[a.gap_md]}>
        <Text style={[a.text_lg, a.font_bold]}>
          <Trans>Try these examples:</Trans>
        </Text>
        
        <View style={[a.gap_sm]}>
          <ExamplePassphrase
            text="correct horse battery staple"
            onPress={() => setPassphrase('correct horse battery staple')}
          />
          <ExamplePassphrase
            text="my favorite coffee shop downtown"
            onPress={() => setPassphrase('my favorite coffee shop downtown')}
          />
          <ExamplePassphrase
            text="purple elephant dancing in moonlight"
            onPress={() => setPassphrase('purple elephant dancing in moonlight')}
          />
          <ExamplePassphrase
            text="short phrase"
            onPress={() => setPassphrase('short phrase')}
          />
        </View>
      </View>

      {/* Current Stats */}
      {passphrase && (
        <View style={[a.gap_sm, a.p_md, a.rounded_sm, {backgroundColor: t.atoms.bg_contrast_100}]}>
          <Text style={[a.font_bold]}>
            <Trans>Passphrase Analysis:</Trans>
          </Text>
          <Text>Length: {passphrase.length} characters</Text>
          <Text>Words: {passphrase.trim().split(/\s+/).filter(word => word.length >= 2).length}</Text>
          <Text>Unique characters: {new Set(passphrase.toLowerCase().split('')).size}</Text>
          <Text>Strength: {strength}</Text>
        </View>
      )}
    </View>
  )
}

function ExamplePassphrase({text, onPress}: {text: string; onPress: () => void}) {
  const t = useTheme()
  
  return (
    <Text
      style={[
        a.p_sm,
        a.rounded_sm,
        a.border,
        {borderColor: t.atoms.border_contrast_medium},
        {color: t.atoms.text_contrast_high},
      ]}
      onPress={onPress}>
      {text}
    </Text>
  )
}