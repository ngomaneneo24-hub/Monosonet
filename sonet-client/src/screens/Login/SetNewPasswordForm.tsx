import {useState} from 'react'
import {ActivityIndicator, View} from 'react-native'
import {SonetAppAgent} from '@sonet/api'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {logEvent} from '#/lib/statsig/statsig'
import {isNetworkError} from '#/lib/strings/errors'
import {cleanError} from '#/lib/strings/errors'
import {checkAndFormatResetCode} from '#/lib/strings/password'
import {logger} from '#/logger'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {FormError} from '#/components/forms/FormError'
import * as TextField from '#/components/forms/TextField'
import {Lock_Stroke2_Corner0_Rounded as Lock} from '#/components/icons/Lock'
import {Ticket_Stroke2_Corner0_Rounded as Ticket} from '#/components/icons/Ticket'
import {PassphraseInput} from '#/components/forms/PassphraseInput'
import {Text} from '#/components/Typography'
import {FormContainer} from './FormContainer'

export const SetNewPasswordForm = ({
  error,
  serviceUrl,
  setError,
  onPressBack,
  onPasswordSet,
}: {
  error: string
  serviceUrl: string
  setError: (v: string) => void
  onPressBack: () => void
  onPasswordSet: () => void
}) => {
  const {_} = useLingui()
  const t = useTheme()

  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [resetCode, setResetCode] = useState<string>('')
  const [password, setPassword] = useState<string>('')

  const onPressNext = async () => {
    // Check that the code is correct. We do this again just incase the user enters the code after their pw and we
    // don't get to call onBlur first
    const formattedCode = checkAndFormatResetCode(resetCode)

    if (!formattedCode) {
      setError(
        _(
          msg`You have entered an invalid code. It should look like XXXXX-XXXXX.`,
        ),
      )
      logEvent('signin:passwordResetFailure', {})
      return
    }

    // TODO Better passphrase strength check
    if (!password) {
      setError(_(msg`Please enter a passphrase.`))
      return
    }
    if (password.length < 20) {
      setError(_(msg`Your passphrase must be at least 20 characters long.`))
      return
    }
    // Check if it has at least 4 words
    const wordCount = password.trim().split(/\s+/).filter(word => word.length >= 2).length
    if (wordCount < 4) {
      setError(_(msg`Your passphrase must contain at least 4 words.`))
      return
    }

    setError('')
    setIsProcessing(true)

    try {
      const agent = new SonetAppAgent({service: serviceUrl})
      await agent.com.sonet.server.resetPassword({
        token: formattedCode,
        password,
      })
      onPasswordSet()
      logEvent('signin:passwordResetSuccess', {})
    } catch (e: any) {
      const errMsg = e.toString()
      logger.warn('Failed to set new password', {error: e})
      logEvent('signin:passwordResetFailure', {})
      setIsProcessing(false)
      if (isNetworkError(e)) {
        setError(
          _(
            msg`Unable to contact your service. Please check your Internet connection.`,
          ),
        )
      } else {
        setError(cleanError(errMsg))
      }
    }
  }

  const onBlur = () => {
    const formattedCode = checkAndFormatResetCode(resetCode)
    if (!formattedCode) {
      setError(
        _(
          msg`You have entered an invalid code. It should look like XXXXX-XXXXX.`,
        ),
      )
      return
    }
    setResetCode(formattedCode)
  }

  return (
    <FormContainer
      testID="setNewPasswordForm"
      titleText={<Trans>Set new passphrase</Trans>}>
      <Text style={[a.leading_snug, a.mb_sm]}>
        <Trans>
          You will receive an email with a "reset code." Enter that code here,
          then enter your new passphrase.
        </Trans>
      </Text>

      <View>
        <TextField.LabelText>
          <Trans>Reset code</Trans>
        </TextField.LabelText>
        <TextField.Root>
          <TextField.Icon icon={Ticket} />
          <TextField.Input
            testID="resetCodeInput"
            label={_(msg`Looks like XXXXX-XXXXX`)}
            autoCapitalize="none"
            autoFocus={true}
            autoCorrect={false}
            autoComplete="off"
            value={resetCode}
            onChangeText={setResetCode}
            onFocus={() => setError('')}
            onBlur={onBlur}
            editable={!isProcessing}
            accessibilityHint={_(
              msg`Input code sent to your email for password reset`,
            )}
          />
        </TextField.Root>
      </View>

              <PassphraseInput
          label={_('New passphrase')}
          value={password}
          onChangeText={setPassword}
          showStrengthMeter={true}
          showToggle={true}
          multiline={true}
          numberOfLines={3}
          testID="newPasswordInput"
          placeholder={_('Enter a passphrase')}
          autoComplete="password"
          returnKeyType="done"
          onSubmitEditing={onPressNext}
          editable={!isProcessing}
          accessibilityHint={_('Input new passphrase')}
        />

      <FormError error={error} />

      <View style={[a.flex_row, a.align_center, a.pt_lg]}>
        <Button
          label={_(msg`Back`)}
          variant="solid"
          color="secondary"
          size="large"
          onPress={onPressBack}>
          <ButtonText>
            <Trans>Back</Trans>
          </ButtonText>
        </Button>
        <View style={a.flex_1} />
        {isProcessing ? (
          <ActivityIndicator />
        ) : (
          <Button
            label={_(msg`Next`)}
            variant="solid"
            color="primary"
            size="large"
            onPress={onPressNext}>
            <ButtonText>
              <Trans>Next</Trans>
            </ButtonText>
          </Button>
        )}
        {isProcessing ? (
          <Text style={[t.atoms.text_contrast_high, a.pl_md]}>
            <Trans>Updating...</Trans>
          </Text>
        ) : undefined}
      </View>
    </FormContainer>
  )
}
