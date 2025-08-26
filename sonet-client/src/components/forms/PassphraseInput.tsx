import React, {useState, useRef} from 'react'
import {type TextInput, View, TextInputProps, Text} from 'react-native'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {FormError} from '#/components/forms/FormError'
import * as TextField from '#/components/forms/TextField'
import {Lock_Stroke2_Corner0_Rounded as Lock} from '#/components/icons/Lock'
import {PassphraseStrengthMeter, calculatePassphraseStrength} from './PassphraseStrengthMeter'
import {PassphraseToggleButton} from './PassphraseToggleButton'

interface PassphraseInputProps extends Omit<TextInputProps, 'secureTextEntry'> {
  label: string
  value: string
  onChangeText: (text: string) => void
  error?: string
  showStrengthMeter?: boolean
  showToggle?: boolean
  multiline?: boolean
  numberOfLines?: number
  testID?: string
  placeholder?: string
  autoComplete?: TextInputProps['autoComplete']
  returnKeyType?: TextInputProps['returnKeyType']
  onSubmitEditing?: () => void
  editable?: boolean
  accessibilityHint?: string
}

export function PassphraseInput({
  label,
  value,
  onChangeText,
  error,
  showStrengthMeter = true,
  showToggle = true,
  multiline = true,
  numberOfLines = 3,
  testID,
  placeholder,
  autoComplete = 'new-password',
  returnKeyType = 'next',
  onSubmitEditing,
  editable = true,
  accessibilityHint,
  ...props
}: PassphraseInputProps) {
  const {_} = useLingui()
  const t = useTheme()
  const [isVisible, setIsVisible] = useState(true)
  const inputRef = useRef<TextInput>(null)

  const strength = calculatePassphraseStrength(value)

  return (
    <View>
      <TextField.LabelText>
        {label}
      </TextField.LabelText>
      
      <TextField.Root isInvalid={!!error}>
        <TextField.Icon icon={Lock} />
        <TextField.Input
          ref={inputRef}
          testID={testID}
          label={placeholder || label}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!isVisible}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          editable={editable}
          accessibilityHint={accessibilityHint}
          multiline={multiline}
          numberOfLines={numberOfLines}
          textAlignVertical="top"
          style={[
            multiline ? [a.min_h_20, a.py_sm] : [a.min_h_12],
            // Ensure text doesn't get cut off on mobile
            {textAlignVertical: 'top'},
          ]}
          {...props}
        />
        
        {showToggle && (
          <PassphraseToggleButton
            isVisible={isVisible}
            onToggle={() => setIsVisible(!isVisible)}
            size="md"
          />
        )}
      </TextField.Root>

      {/* Error Display */}
      {error && <FormError error={error} />}

      {/* Strength Meter */}
      {showStrengthMeter && value && (
        <PassphraseStrengthMeter
          passphrase={value}
          strength={strength}
          showDetails={true}
        />
      )}

      {/* Help Text for Signup */}
      {showStrengthMeter && (
        <Text style={[a.text_sm, t.atoms.text_contrast_medium, a.mt_sm, a.px_sm]}>
          <Trans>
            A passphrase is 4 or more words that are easy to remember but hard to guess. 
            For example: "correct horse battery staple" or "my favorite coffee shop downtown"
          </Trans>
        </Text>
      )}
    </View>
  )
}