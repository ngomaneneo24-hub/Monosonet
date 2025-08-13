import React, {useEffect, useState} from 'react'
import {ActivityIndicator, Platform, View} from 'react-native'
import ReactNativeDeviceAttest from 'react-native-device-attest'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {nanoid} from 'nanoid/non-secure'

import {createFullUsername} from '#/lib/strings/usernames'
import {logger} from '#/logger'
import {isAndroid, isIOS, isNative, isWeb} from '#/platform/detection'
import {ScreenTransition} from '#/screens/Login/ScreenTransition'
import {useSignupContext} from '#/screens/Signup/state'
import {CaptchaWebView} from '#/screens/Signup/StepCaptcha/CaptchaWebView'
import {atoms as a, useTheme} from '#/alf'
import {FormError} from '#/components/forms/FormError'
import {GCP_PROJECT_ID} from '#/env'
import {BackNextButtons} from '../BackNextButtons'

const CAPTCHA_PATH =
  isWeb || GCP_PROJECT_ID === 0 ? '/gate/signup' : '/gate/signup/attempt-attest'

export function StepCaptcha() {
  if (isWeb) {
    return <StepCaptchaInner />
  } else {
    return <StepCaptchaNative />
  }
}

export function StepCaptchaNative() {
  const [token, setToken] = useState<string>()
  const [payload, setPayload] = useState<string>()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    ;(async () => {
      // Debug logging removed for production
      try {
        if (isIOS) {
          // Debug logging removed for production
          const token = await ReactNativeDeviceAttest.getDeviceCheckToken()
          setToken(token)
                      // Debug logging removed for production
        } else {
          const {token, payload} =
            await ReactNativeDeviceAttest.getIntegrityToken('signup')
          setToken(token)
          setPayload(base64UrlEncode(payload))
        }
      } catch (e: any) {
        logger.error(e)
      } finally {
        setReady(true)
      }
    })()
  }, [])

  if (!ready) {
    return <View />
  }

  return <StepCaptchaInner token={token} payload={payload} />
}

function StepCaptchaInner({
  token,
  payload,
}: {
  token?: string
  payload?: string
}) {
  const {_} = useLingui()
  const theme = useTheme()
  const {state, dispatch} = useSignupContext()

  const [completed, setCompleted] = React.useState(false)

  const stateParam = React.useMemo(() => nanoid(15), [])
  const url = React.useMemo(() => {
    const newUrl = new URL(state.serviceUrl)
    newUrl.pathname = CAPTCHA_PATH
    newUrl.searchParams.set(
      'username',
      createFullUsername(state.username, state.userDomain),
    )
    newUrl.searchParams.set('state', stateParam)
    newUrl.searchParams.set('colorScheme', theme.name)

    if (isNative && token) {
      newUrl.searchParams.set('platform', Platform.OS)
      newUrl.searchParams.set('token', token)
      if (isAndroid && payload) {
        newUrl.searchParams.set('payload', payload)
      }
    }

    return newUrl.href
  }, [
    state.serviceUrl,
    state.username,
    state.userDomain,
    stateParam,
    theme.name,
    token,
    payload,
  ])

  const onSuccess = React.useCallback(
    (code: string) => {
      setCompleted(true)
      logger.metric('signup:captchaSuccess', {}, {statsig: true})
      dispatch({
        type: 'submit',
        task: {verificationCode: code, mutableProcessed: false},
      })
    },
    [dispatch],
  )

  const onError = React.useCallback(
    (error?: unknown) => {
      dispatch({
        type: 'setError',
        value: _(msg`Error receiving captcha response.`),
      })
      logger.metric('signup:captchaFailure', {}, {statsig: true})
      logger.error('Signup Flow Error', {
        registrationUsername: state.username,
        error,
      })
    },
    [_, dispatch, state.username],
  )

  const onBackPress = React.useCallback(() => {
    logger.error('Signup Flow Error', {
      errorMessage:
        'User went back from captcha step. Possibly encountered an error.',
      registrationUsername: state.username,
    })

    dispatch({type: 'prev'})
  }, [dispatch, state.username])

  return (
    <ScreenTransition>
      <View style={[a.gap_lg, a.pt_lg]}>
        <View
          style={[
            a.w_full,
            a.overflow_hidden,
            {minHeight: 510},
            completed && [a.align_center, a.justify_center],
          ]}>
          {!completed ? (
            <CaptchaWebView
              url={url}
              stateParam={stateParam}
              state={state}
              onSuccess={onSuccess}
              onError={onError}
            />
          ) : (
            <ActivityIndicator size="large" />
          )}
        </View>
        <FormError error={state.error} />
      </View>
      <BackNextButtons
        hideNext
        isLoading={state.isLoading}
        onBackPress={onBackPress}
      />
    </ScreenTransition>
  )
}

function base64UrlEncode(data: string): string {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(data)

  const binaryString = String.fromCharCode(...bytes)
  const base64 = btoa(binaryString)

  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/[=]/g, '')
}
