import {View} from 'react-native'
import {useCallback, useMemo} from 'react'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useNavigation} from '@react-navigation/native'

import {useSession} from '#/state/session'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {ArrowRight_Stroke2_Corner0_Rounded as ArrowRightIcon} from '#/components/icons/Arrow'
import {Message_Stroke2_Corner0_Rounded as MessageIcon} from '#/components/icons/Message'
import {Text} from '#/components/Typography'
import {Avatar} from '#/view/com/util/Avatar'
import {useModerationCause} from '#/lib/moderation/useModerationCause'
import {useModerationCauseLabel} from '#/lib/moderation/useModerationCauseLabel'
import {useModerationCauseDescription} from '#/lib/moderation/useModerationCauseDescription'

export function ChatListItem({
  convo,
  showMenu = true,
  children,
}: {
  convo: any | any // TODO: Replace with proper Sonet chat type
  showMenu?: boolean
  children?: React.ReactNode
}) {
  const {_} = useLingui()
  const t = useTheme()
  const {currentAccount} = useSession()
  const navigation = useNavigation()

  const usernamePress = useCallback(() => {
    navigation.navigate('MessagesConversation' as any, {
      conversation: convo.id || convo.chat_id,
    })
  }, [navigation, convo])

  // Extract user info from conversation
  const otherUser = convo.members?.find(
    (member: any) => member.userId !== currentAccount?.userId,
  )
  
  const username = otherUser?.username || 'unknown'
  const displayName = otherUser?.displayName || username
  const avatar = otherUser?.avatar
  const lastMessage = convo.lastMessage
  const unreadCount = convo.unreadCount || 0
  const isMuted = convo.muted || false

  // Username different message types
  const renderLastMessage = () => {
    if (!lastMessage) {
      return (
        <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
          <Trans>No messages yet</Trans>
        </Text>
      )
    }

    if (lastMessage.type === 'deleted') {
      return (
        <Text style={[a.text_sm, t.atoms.text_contrast_medium, a.font_italic]}>
          <Trans>Message deleted</Trans>
        </Text>
      )
    }

    if (lastMessage.type === 'reaction') {
      return (
        <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
          <Trans>Reacted to a message</Trans>
        </Text>
      )
    }

    // Regular message
    const messageText = lastMessage.text || ''
    if (messageText.length > 50) {
      return (
        <Text style={[a.text_sm, t.atoms.text_contrast_medium]} numberOfLines={1}>
          {messageText.substring(0, 50)}...
        </Text>
      )
    }
    return (
      <Text style={[a.text_sm, t.atoms.text_contrast_medium]} numberOfLines={1}>
        {messageText}
      </Text>
    )
  }

  // Username embeds
  const renderEmbed = () => {
    if (!lastMessage?.embed) return null

    const embed = lastMessage.embed
    switch (embed.type) {
      case 'images':
        return (
          <View style={[a.flex_row, a.align_center, a.gap_xs, a.mt_xs]}>
            <MessageIcon width={16} height={16} fill={t.atoms.text_contrast_low.color} />
            <Text style={[a.text_xs, t.atoms.text_contrast_low]}>
              <Trans>Photo</Trans>
            </Text>
          </View>
        )
      
      case 'external':
        return (
          <View style={[a.flex_row, a.align_center, a.gap_xs, a.mt_xs]}>
            <MessageIcon width={16} height={16} fill={t.atoms.text_contrast_low.color} />
            <Text style={[a.text_xs, t.atoms.text_contrast_low]} numberOfLines={1}>
              {embed.external?.title || 'Link'}
            </Text>
          </View>
        )
      
      case 'record':
        if (embed.record?.type === 'note') {
          return (
            <View style={[a.flex_row, a.align_center, a.gap_xs, a.mt_xs]}>
              <Text style={[a.text_xs, t.atoms.text_contrast_low]}>
                <Trans>Note</Trans>
              </Text>
            </View>
          )
        }
        return null
      
      default:
        return null
    }
  }

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
          <View style={[a.flex_row, a.align_center, a.gap_sm, a.mb_xs]}>
            <Text style={[a.text_md, a.font_bold, a.leading_snug]} numberOfLines={1}>
              {displayName}
            </Text>
            {isMuted && (
              <View
                style={[
                  a.px_xs,
                  a.py_2xs,
                  a.rounded_sm,
                  t.atoms.bg_contrast_25,
                ]}>
                <Text style={[a.text_xs, t.atoms.text_contrast_low]}>
                  <Trans>Muted</Trans>
                </Text>
              </View>
            )}
          </View>
          
          <Text style={[a.text_sm, t.atoms.text_contrast_medium]} numberOfLines={1}>
            @{username}
          </Text>
          
          {renderLastMessage()}
          {renderEmbed()}
        </View>
      </View>

      <View style={[a.align_end, a.gap_sm]}>
        {unreadCount > 0 && (
          <View
            style={[
              a.rounded_full,
              a.min_w_6,
              a.h_6,
              a.align_center,
              a.justify_center,
              t.palette.primary_500,
            ]}>
            <Text style={[a.text_xs, a.font_bold, {color: 'white'}]}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
        
        {showMenu && (
          <Button
            label={_(msg`Open conversation`)}
            size="small"
            color="secondary"
            variant="ghost"
            onPress={usernamePress}>
            <ButtonIcon icon={ArrowRightIcon} />
          </Button>
        )}
      </View>
      
      {children}
    </View>
  )
}
