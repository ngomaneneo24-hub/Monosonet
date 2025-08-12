import {useState} from 'react'
import {View} from 'react-native'
import Animated, {
  FadeIn,
  FadeOut,
  LayoutAnimationConfig,
  LinearTransition,
} from 'react-native-reanimated'
import {msg, Plural, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {useGate} from '#/lib/statsig/statsig'
import {
  createFullUsername,
  MAX_SERVICE_HANDLE_LENGTH,
  validateServiceUsername,
} from '#/lib/strings/usernames'
import {logger} from '#/logger'
import {
  checkUsernameAvailability,
  useUsernameAvailabilityQuery,
} from '#/state/queries/username-availability'
import {ScreenTransition} from '#/screens/Login/ScreenTransition'
import {useSignupContext} from '#/screens/Signup/state'
import {atoms as a, native, useTheme} from '#/alf'
import * as TextField from '#/components/forms/TextField'
import {useThrottledValue} from '#/components/hooks/useThrottledValue'
import {At_Stroke2_Corner0_Rounded as AtIcon} from '#/components/icons/At'
import {Check_Stroke2_Corner0_Rounded as CheckIcon} from '#/components/icons/Check'
import {Text} from '#/components/Typography'
import {IS_INTERNAL} from '#/env'
import {BackNextButtons} from '../BackNextButtons'
import {UsernameSuggestions} from './UsernameSuggestions'

export function StepUsername() {
  const {_} = useLingui()
  const t = useTheme()
  const gate = useGate()
  const {state, dispatch} = useSignupContext()
  const [draftValue, setDraftValue] = useState(state.username)
  const isNextLoading = useThrottledValue(state.isLoading, 500)

  const validCheck = validateServiceUsername(draftValue, state.userDomain)

  const {
    debouncedUsername: debouncedDraftValue,
    enabled: queryEnabled,
    query: {data: isUsernameAvailable, isPending},
  } = useUsernameAvailabilityQuery({
    username: draftValue,
    serviceDid: state.serviceDescription?.userId ?? 'UNKNOWN',
    serviceDomain: state.userDomain,
    birthDate: state.dateOfBirth.toISOString(),
    email: state.email,
    enabled: validCheck.overall,
  })

  const onNextPress = async () => {
    const username = draftValue.trim()
    dispatch({
      type: 'setUsername',
      value: username,
    })

    if (!validCheck.overall) {
      return
    }

    dispatch({type: 'setIsLoading', value: true})

    try {
      const {available: usernameAvailable} = await checkUsernameAvailability(
        createFullUsername(username, state.userDomain),
        state.serviceDescription?.userId ?? 'UNKNOWN',
        {typeahead: false},
      )

      if (!usernameAvailable) {
        dispatch({
          type: 'setError',
          value: _(msg`That username is already taken`),
          field: 'username',
        })
        return
      }
    } catch (error) {
      logger.error('Failed to check username availability on next press', {
        safeMessage: error,
      })
      // do nothing on error, let them pass
    } finally {
      dispatch({type: 'setIsLoading', value: false})
    }

    logger.metric(
      'signup:nextPressed',
      {
        activeStep: state.activeStep,
        phoneVerificationRequired:
          state.serviceDescription?.phoneVerificationRequired,
      },
      {statsig: true},
    )
    // phoneVerificationRequired is actually whether a captcha is required
    if (!state.serviceDescription?.phoneVerificationRequired) {
      dispatch({
        type: 'submit',
        task: {verificationCode: undefined, mutableProcessed: false},
      })
      return
    }
    dispatch({type: 'next'})
  }

  const onBackPress = () => {
    const username = draftValue.trim()
    dispatch({
      type: 'setUsername',
      value: username,
    })
    dispatch({type: 'prev'})
    logger.metric(
      'signup:backPressed',
      {activeStep: state.activeStep},
      {statsig: true},
    )
  }

  const hasDebounceSettled = draftValue === debouncedDraftValue
  const isUsernameTaken =
    !isPending &&
    queryEnabled &&
    isUsernameAvailable &&
    !isUsernameAvailable.available
  const isNotReady = isPending || !hasDebounceSettled
  const isNextDisabled =
    !validCheck.overall || !!state.error || isNotReady ? true : isUsernameTaken

  const textFieldInvalid =
    isUsernameTaken ||
    !validCheck.frontLengthNotTooLong ||
    !validCheck.usernameChars ||
    !validCheck.hyphenStartOrEnd ||
    !validCheck.totalLength

  return (
    <ScreenTransition>
      <View style={[a.gap_sm, a.pt_lg, a.z_10]}>
        <View>
          <TextField.Root isInvalid={textFieldInvalid}>
            <TextField.Icon icon={AtIcon} />
            <TextField.Input
              testID="usernameInput"
              onChangeText={val => {
                if (state.error) {
                  dispatch({type: 'setError', value: ''})
                }
                setDraftValue(val.toLocaleLowerCase())
              }}
              label={state.userDomain}
              value={draftValue}
              keyboardType="ascii-capable" // fix for iOS replacing -- with —
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              autoComplete="off"
            />
            {draftValue.length > 0 && (
              <TextField.GhostText value={state.userDomain}>
                {draftValue}
              </TextField.GhostText>
            )}
            {isUsernameAvailable?.available && (
              <CheckIcon style={[{color: t.palette.positive_600}, a.z_20]} />
            )}
          </TextField.Root>
        </View>
        <LayoutAnimationConfig skipEntering skipExiting>
          <View style={[a.gap_xs]}>
            {state.error && (
              <Requirement>
                <RequirementText>{state.error}</RequirementText>
              </Requirement>
            )}
            {isUsernameTaken && validCheck.overall && (
              <>
                <Requirement>
                  <RequirementText>
                    <Trans>
                      {createFullUsername(draftValue, state.userDomain)} is not
                      available
                    </Trans>
                  </RequirementText>
                </Requirement>
                {isUsernameAvailable.suggestions &&
                  isUsernameAvailable.suggestions.length > 0 &&
                  (gate('username_suggestions') || IS_INTERNAL) && (
                    <UsernameSuggestions
                      suggestions={isUsernameAvailable.suggestions}
                      onSelect={suggestion => {
                        setDraftValue(
                          suggestion.username.slice(
                            0,
                            state.userDomain.length * -1,
                          ),
                        )
                        logger.metric('signup:usernameSuggestionSelected', {
                          method: suggestion.method,
                        })
                      }}
                    />
                  )}
              </>
            )}
            {(!validCheck.usernameChars || !validCheck.hyphenStartOrEnd) && (
              <Requirement>
                {!validCheck.hyphenStartOrEnd ? (
                  <RequirementText>
                    <Trans>Username cannot begin or end with a hyphen</Trans>
                  </RequirementText>
                ) : (
                  <RequirementText>
                    <Trans>
                      Username must only contain letters (a-z), numbers, and
                      hyphens
                    </Trans>
                  </RequirementText>
                )}
              </Requirement>
            )}
            <Requirement>
              {(!validCheck.frontLengthNotTooLong ||
                !validCheck.totalLength) && (
                <RequirementText>
                  <Trans>
                    Username cannot be longer than{' '}
                    <Plural
                      value={MAX_SERVICE_HANDLE_LENGTH}
                      other="# characters"
                    />
                  </Trans>
                </RequirementText>
              )}
            </Requirement>
          </View>
        </LayoutAnimationConfig>
      </View>
      <Animated.View layout={native(LinearTransition)}>
        <BackNextButtons
          isLoading={isNextLoading}
          isNextDisabled={isNextDisabled}
          onBackPress={onBackPress}
          onNextPress={onNextPress}
        />
      </Animated.View>
    </ScreenTransition>
  )
}

function Requirement({children}: {children: React.ReactNode}) {
  return (
    <Animated.View
      style={[a.w_full]}
      layout={native(LinearTransition)}
      entering={native(FadeIn)}
      exiting={native(FadeOut)}>
      {children}
    </Animated.View>
  )
}

function RequirementText({children}: {children: React.ReactNode}) {
  const t = useTheme()
  return (
    <Text style={[a.text_sm, a.flex_1, {color: t.palette.negative_500}]}>
      {children}
    </Text>
  )
}
