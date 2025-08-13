import {View} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useNavigation} from '@react-navigation/native'
import {useCallback} from 'react'

import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {Check_Stroke2_Corner0_Rounded as CheckIcon} from '#/components/icons/Check'
import {TimesLarge_Stroke2_Corner0_Rounded as XIcon} from '#/components/icons/Times'
import {Text} from '#/components/Typography'
import {Avatar} from '#/view/com/util/Avatar'
import {useAcceptChatRequest} from '#/state/queries/messages/accept-chat-request'
import {useDeclineChatRequest} from '#/state/queries/messages/decline-chat-request'

export function RequestListItem({
  convo,
}: {
  convo: any // TODO: Replace with proper Sonet chat type
}) {
  const {_} = useLingui()
  const t = useTheme()
  const navigation = useNavigation()

  const {mutate: acceptRequest, isPending: isAccepting} = useAcceptChatRequest()
  const {mutate: declineRequest, isPending: isDeclining} = useDeclineChatRequest()

  const usernameAccept = useCallback(() => {
    acceptRequest(
      {conversationId: convo.id},
      {
        onSuccess: () => {
          // Navigate to the conversation
          navigation.navigate('MessagesConversation' as any, {
            conversation: convo.id,
          })
        },
      },
    )
  }, [acceptRequest, convo.id, navigation])

  const usernameDecline = useCallback(() => {
    declineRequest(
      {conversationId: convo.id},
      {
        onSuccess: () => {
          // Request declined, stay on inbox
        },
      },
    )
  }, [declineRequest, convo.id])

  const usernamePress = useCallback(() => {
    // Navigate to conversation preview
    navigation.navigate('MessagesConversation' as any, {
      conversation: convo.id,
    })
  }, [navigation, convo.id])

  // Extract user info from conversation
  const otherUser = convo.members?.find(
    (member: any) => member.userId !== convo.currentUserDid,
  )
  
  const username = otherUser?.username || 'unknown'
  const displayName = otherUser?.displayName || username
  const avatar = otherUser?.avatar
  const lastMessage = convo.lastMessage?.text || ''

  return (
    <View
      style={[
        a.flex_row,
        a.align_center,
        a.justify_between,
        a.px_md,
        a.py_md,
        a.border_b,
        t.atoms.border_contrast_low,
      ]}>
      <View
        style={[a.flex_row, a.align_center, a.flex_1, a.mr_sm]}
        onTouchEnd={usernamePress}>
        <Avatar size={48} image={avatar} style={[a.mr_md]} />
        
        <View style={[a.flex_1, a.min_w_0]}>
          <Text style={[a.text_md, a.font_bold, a.leading_snug]} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={[a.text_sm, t.atoms.text_contrast_medium]} numberOfLines={1}>
            @{username}
          </Text>
          {lastMessage && (
            <Text
              style={[a.text_sm, t.atoms.text_contrast_medium, a.mt_xs]}
              numberOfLines={2}>
              {lastMessage}
            </Text>
          )}
        </View>
      </View>

      <View style={[a.flex_row, a.gap_sm]}>
        <Button
          label={_(msg`Accept chat request`)}
          size="small"
          color="primary"
          variant="solid"
          onPress={usernameAccept}
          disabled={isAccepting || isDeclining}>
          <ButtonIcon icon={CheckIcon} />
          <ButtonText>
            <Trans>Accept</Trans>
          </ButtonText>
        </Button>

        <Button
          label={_(msg`Decline chat request`)}
          size="small"
          color="secondary"
          variant="ghost"
          onPress={usernameDecline}
          disabled={isAccepting || isDeclining}>
          <ButtonIcon icon={XIcon} />
          <ButtonText>
            <Trans>Decline</Trans>
          </ButtonText>
        </Button>
      </View>
    </View>
  )
}
