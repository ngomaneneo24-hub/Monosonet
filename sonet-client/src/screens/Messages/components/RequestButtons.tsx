import {View} from 'react-native'
import {useCallback} from 'react'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {Check_Stroke2_Corner0_Rounded as CheckIcon} from '#/components/icons/Check'
import {TimesLarge_Stroke2_Corner0_Rounded as XIcon} from '#/components/icons/Times'
import {Text} from '#/components/Typography'
import {useAcceptChatRequest} from '#/state/queries/messages/accept-chat-request'
import {useDeclineChatRequest} from '#/state/queries/messages/decline-chat-request'

export function AcceptChatButton({
  convo,
  currentScreen,
}: {
  convo: any // TODO: Replace with proper Sonet chat type
  currentScreen: 'list' | 'conversation'
}) {
  const {_} = useLingui()
  const {mutate: acceptRequest, isPending} = useAcceptChatRequest()

  const usernameAccept = useCallback(() => {
    acceptRequest(
      {conversationId: convo.id},
      {
        onSuccess: () => {
          // Request accepted
        },
      },
    )
  }, [acceptRequest, convo.id])

  return (
    <Button
      label={_(msg`Accept chat request`)}
      size="small"
      color="primary"
      variant="solid"
      onPress={usernameAccept}
      disabled={isPending}>
      <ButtonIcon icon={CheckIcon} />
      <ButtonText>
        <Trans>Accept</Trans>
      </ButtonText>
    </Button>
  )
}

export function DeclineChatButton({
  convo,
  currentScreen,
}: {
  convo: any // TODO: Replace with proper Sonet chat type
  currentScreen: 'list' | 'conversation'
}) {
  const {_} = useLingui()
  const {mutate: declineRequest, isPending} = useDeclineChatRequest()

  const usernameDecline = useCallback(() => {
    declineRequest(
      {conversationId: convo.id},
      {
        onSuccess: () => {
          // Request declined
        },
      },
    )
  }, [declineRequest, convo.id])

  return (
    <Button
      label={_(msg`Decline chat request`)}
      size="small"
      color="secondary"
      variant="ghost"
      onPress={usernameDecline}
      disabled={isPending}>
      <ButtonIcon icon={XIcon} />
      <ButtonText>
        <Trans>Decline</Trans>
      </ButtonText>
    </Button>
  )
}

export function RejectMenu({
  convo,
  profile,
  showDeleteConvo,
  currentScreen,
}: {
  convo: any // TODO: Replace with proper Sonet chat type
  profile: any // TODO: Replace with proper Sonet user type
  showDeleteConvo: boolean
  currentScreen: 'list' | 'conversation'
}) {
  const {_} = useLingui()
  const t = useTheme()
  const {mutate: declineRequest, isPending} = useDeclineChatRequest()

  const usernameDecline = useCallback(() => {
    declineRequest(
      {conversationId: convo.id},
      {
        onSuccess: () => {
          // Request declined
        },
      },
    )
  }, [declineRequest, convo.id])

  const lastMessage = convo.lastMessage?.text || ''

  return (
    <View style={[a.flex_row, a.gap_sm]}>
      <Button
        label={_(msg`Decline chat request`)}
        size="small"
        color="secondary"
        variant="ghost"
        onPress={usernameDecline}
        disabled={isPending}>
        <ButtonIcon icon={XIcon} />
        <ButtonText>
          <Trans>Decline</Trans>
        </ButtonText>
      </Button>
      
      {showDeleteConvo && (
        <Button
          label={_(msg`Delete conversation`)}
          size="small"
          color="negative"
          variant="ghost"
          onPress={() => {
            if (confirm(_('Delete this conversation?'))) {
              sonetMessagingApi.deleteChat(convo.id).catch(err => console.error(err))
            }
          }}>
          <ButtonText>
            <Trans>Delete</Trans>
          </ButtonText>
        </Button>
      )}
    </View>
  )
}
