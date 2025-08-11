import React, {useCallback, useEffect} from 'react'
import {View} from 'react-native'
// AT Protocol removed - using Sonet messaging
import type {ModerationDecision} from '#/state/preferences/moderation-opts'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {
  type RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'

import {useEmail} from '#/lib/hooks/useEmail'
import {useEnableKeyboardControllerScreen} from '#/lib/hooks/useEnableKeyboardController'
import {useNonReactiveCallback} from '#/lib/hooks/useNonReactiveCallback'
import {
  type CommonNavigatorParams,
  type NavigationProp,
} from '#/lib/routes/types'
import {isWeb} from '#/platform/detection'
import {type Shadow, useMaybeProfileShadow} from '#/state/cache/profile-shadow'
import {UnifiedConvoProvider, useUnifiedConvoState, useUnifiedConvoApi} from '#/state/messages/hybrid-provider'
import {useCurrentConvoId} from '#/state/messages/current-convo-id'
import {useModerationOpts} from '#/state/preferences/moderation-opts'
import {useSetMinimalShellMode} from '#/state/shell'
import {MessagesList} from '#/screens/Messages/components/MessagesList'
import {atoms as a, useBreakpoints, useTheme, web} from '#/alf'
import {AgeRestrictedScreen} from '#/components/ageAssurance/AgeRestrictedScreen'
import {useAgeAssuranceCopy} from '#/components/ageAssurance/useAgeAssuranceCopy'
import {
  EmailDialogScreenID,
  useEmailDialogControl,
} from '#/components/dialogs/EmailDialog'
import {SonetMessagesListBlockedFooter} from '#/components/dms/SonetMessagesListBlockedFooter'
import {SonetMessagesListHeader} from '#/components/dms/SonetMessagesListHeader'
import {Error} from '#/components/Error'
import * as Layout from '#/components/Layout'
import {Loader} from '#/components/Loader'
import {SonetMigrationStatus} from '#/components/SonetMigrationStatus'
import {moderateProfile, isProfileActive} from '#/lib/moderation'

type Props = NativeStackScreenProps<
  CommonNavigatorParams,
  'MessagesConversation'
>

export function MessagesConversationScreen(props: Props) {
  const {_} = useLingui()
  const aaCopy = useAgeAssuranceCopy()
  return (
    <AgeRestrictedScreen
      screenTitle={_(msg`Conversation`)}
      infoText={aaCopy.chatsInfoText}>
      <MessagesConversationScreenInner {...props} />
    </AgeRestrictedScreen>
  )
}

export function MessagesConversationScreenInner({route}: Props) {
  const {gtMobile} = useBreakpoints()
  const setMinimalShellMode = useSetMinimalShellMode()

  const convoId = route.params.conversation
  const {setCurrentConvoId} = useCurrentConvoId()

  useEnableKeyboardControllerScreen(true)

  useFocusEffect(
    useCallback(() => {
      setCurrentConvoId(convoId)

      if (isWeb && !gtMobile) {
        setMinimalShellMode(true)
      } else {
        setMinimalShellMode(false)
      }

      return () => {
        setCurrentConvoId(undefined)
        setMinimalShellMode(false)
      }
    }, [gtMobile, convoId, setCurrentConvoId, setMinimalShellMode]),
  )

  return (
    <Layout.Screen testID="convoScreen" style={web([{minHeight: 0}, a.flex_1])}>
      <UnifiedConvoProvider key={convoId} convoId={convoId}>
        <Inner />
      </UnifiedConvoProvider>
    </Layout.Screen>
  )
}

function Inner() {
  const t = useTheme()
  const state = useUnifiedConvoState()
  const api = useUnifiedConvoApi()
  const {_} = useLingui()

  const moderationOpts = useModerationOpts()
  
  // Get recipient from Sonet chat state
  const recipient = state.chat?.participants?.[0] ? {
    did: state.chat.participants[0].id,
    handle: state.chat.participants[0].username,
    displayName: state.chat.participants[0].displayName,
    avatar: state.chat.participants[0].avatar,
  } : null

  const moderation = React.useMemo(() => {
    if (!recipient || !moderationOpts) return null
    return moderateProfile(recipient, moderationOpts)
  }, [recipient, moderationOpts])

  // Check if the conversation is ready to show
  const [hasScrolled, setHasScrolled] = React.useState(false)
  const readyToShow =
    hasScrolled ||
    (state.status === 'ready' &&
      !state.isLoading &&
      state.messages.length === 0)

  // Reset hasScrolled when conversation status changes
  React.useEffect(() => {
    if (state.status === 'loading') {
      setHasScrolled(false)
    }
  }, [state.status])

  if (state.status === 'error') {
    return (
      <>
        <Layout.Center style={[a.flex_1]}>
          {moderation ? (
            <MessagesListHeader moderation={moderation} profile={recipient} />
          ) : (
            <MessagesListHeader />
          )}
        </Layout.Center>
        <Error
          title={_(msg`Something went wrong`)}
          message={_(msg`We couldn't load this conversation`)}
          onRetry={() => api.refresh()}
          sideBorders={false}
        />
      </>
    )
  }

  return (
    <Layout.Center style={[a.flex_1]}>
      {/* Show migration status for Sonet messaging */}
      <View style={[a.p_4, a.w_full]}>
        <SonetMigrationStatus />
      </View>
              {!readyToShow &&
          (moderation ? (
            <SonetMessagesListHeader moderation={moderation} profile={recipient} />
          ) : (
            <SonetMessagesListHeader />
          ))}
      <View style={[a.flex_1]}>
        {moderation && recipient ? (
          <InnerReady
            moderation={moderation}
            recipient={recipient}
            hasScrolled={hasScrolled}
            setHasScrolled={setHasScrolled}
          />
        ) : (
          <View style={[a.align_center, a.gap_sm, a.flex_1]} />
        )}
        {!readyToShow && (
          <View
            style={[
              a.absolute,
              a.z_10,
              a.w_full,
              a.h_full,
              a.justify_center,
              a.align_center,
              t.atoms.bg,
            ]}>
            <View style={[{marginBottom: 75}]}>
              <Loader size="xl" />
            </View>
          </View>
        )}
      </View>
    </Layout.Center>
  )
}

function InnerReady({
  moderation,
  recipient,
  hasScrolled,
  setHasScrolled,
}: {
  moderation: ModerationDecision
  recipient: any // Simplified type for Sonet
  hasScrolled: boolean
  setHasScrolled: React.Dispatch<React.SetStateAction<boolean>>
}) {
  const state = useUnifiedConvoState()
  const navigation = useNavigation<NavigationProp>()
  const {params} =
    useRoute<RouteProp<CommonNavigatorParams, 'MessagesConversation'>>()
  const {needsEmailVerification} = useEmail()
  const emailDialogControl = useEmailDialogControl()

  /**
   * Must be non-reactive, otherwise the update to open the global dialog will
   * cause a re-render loop.
   */
  const maybeBlockForEmailVerification = useNonReactiveCallback(() => {
    if (needsEmailVerification) {
      /*
       * HACKFIX
       *
       * Load bearing timeout, to bump this state update until the after the
       * `navigator.addListener('state')` handler closes elements from
       * `shell/index.*.tsx`  - sfn & esb
       */
      setTimeout(() =>
        emailDialogControl.open({
          id: EmailDialogScreenID.Verify,
          instructions: [
            <Trans key="pre-compose">
              Before you can message another user, you must first verify your
              email.
            </Trans>,
          ],
          onCloseWithoutVerifying: () => {
            if (navigation.canGoBack()) {
              navigation.goBack()
            } else {
              navigation.navigate('Messages', {animation: 'pop'})
            }
          },
        }),
      )
    }
  })

  useEffect(() => {
    maybeBlockForEmailVerification()
  }, [maybeBlockForEmailVerification])

  return (
    <>
      <SonetMessagesListHeader profile={recipient} moderation={moderation} />
      {state.status === 'ready' && (
        <MessagesList
          hasScrolled={hasScrolled}
          setHasScrolled={setHasScrolled}
          blocked={moderation?.blocked}
          hasAcceptOverride={!!params.accept}
          footer={
            <SonetMessagesListBlockedFooter
              recipient={recipient}
              convoId={state.chat?.id || ''}
              hasMessages={state.messages.length > 0}
              moderation={moderation}
            />
          }
        />
      )}
    </>
  )
}
