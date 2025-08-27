import {memo, useCallback} from 'react'
import {LayoutAnimation} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import {type SonetConvoDefs, RichText} from '@sonet/api'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {useOpenLink} from '#/lib/hooks/useOpenLink'
import {richTextToString} from '#/lib/strings/rich-text-helpers'
import {getTranslatorLink} from '#/locale/helpers'
import {logger} from '#/logger'
import {isNative} from '#/platform/detection'
import {useConvoActive} from '#/state/messages/convo'
import {useLanguagePrefs} from '#/state/preferences'
import {useSession} from '#/state/session'
import * as Toast from '#/view/com/util/Toast'
import * as ContextMenu from '#/components/ContextMenu'
import {type TriggerProps} from '#/components/ContextMenu/types'
import {ReportDialog} from '#/components/dms/ReportDialog'
import {BubbleQuestion_Stroke2_Corner0_Rounded as Translate} from '#/components/icons/Bubble'
import {Clipboard_Stroke2_Corner2_Rounded as ClipboardIcon} from '#/components/icons/Clipboard'
import {Trash_Stroke2_Corner0_Rounded as Trash} from '#/components/icons/Trash'
import {Warning_Stroke2_Corner0_Rounded as Warning} from '#/components/icons/Warning'
import {Reply_Stroke2_Corner0_Rounded as ReplyIcon} from '#/components/icons/Reply'
import {Edit_Stroke2_Corner0_Rounded as EditIcon} from '#/components/icons/Edit'
import {Pin_Stroke2_Corner0_Rounded as PinIcon} from '#/components/icons/Pin'
import * as Prompt from '#/components/Prompt'
import {usePromptControl} from '#/components/Prompt'
import {EmojiReactionPicker} from './EmojiReactionPicker'
import {hasReachedReactionLimit} from './util'

export let MessageContextMenu = ({
  message,
  children,
  onReply,
  onEdit,
  onDelete,
  onPin,
}: {
  message: SonetConvoDefs.MessageView
  children: TriggerProps['children']
  onReply?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onPin?: () => void
}): React.ReactNode => {
  const {_} = useLingui()
  const {currentAccount} = useSession()
  const convo = useConvoActive()
  const deleteControl = usePromptControl()
  const reportControl = usePromptControl()
  const langPrefs = useLanguagePrefs()
  const openLink = useOpenLink()

  const isFromSelf = message.sender?.userId === currentAccount?.userId

  const onCopyMessage = useCallback(() => {
    const str = richTextToString(
      new RichText({
        text: message.text,
        facets: message.facets,
      }),
      true,
    )

    Clipboard.setStringAsync(str)
    Toast.show(_(msg`Copied to clipboard`), 'clipboard-check')
  }, [_, message.text, message.facets])

  const onPressTranslateMessage = useCallback(() => {
    const translatorUrl = getTranslatorLink(
      message.text,
      langPrefs.primaryLanguage,
    )
    openLink(translatorUrl, true)

    logger.metric(
      'translate',
      {
        sourceLanguages: [],
        targetLanguage: langPrefs.primaryLanguage,
        textLength: message.text.length,
      },
      {statsig: false},
    )
  }, [langPrefs.primaryLanguage, message.text, openLink])

  const handleDelete = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    if (onDelete) {
      onDelete()
    } else {
      convo
        .deleteMessage(message.id)
        .then(() =>
          Toast.show(_(msg({message: 'Message deleted', context: 'toast'}))),
        )
        .catch(() => Toast.show(_(msg`Failed to delete message`)))
    }
  }, [_, convo, message.id, onDelete])

  const onEmojiSelect = useCallback(
    (emoji: string) => {
      if (
        message.reactions?.find(
          reaction =>
            reaction.value === emoji &&
            reaction.sender.userId === currentAccount?.userId,
        )
      ) {
        convo
          .removeReaction(message.id, emoji)
          .catch(() => Toast.show(_(msg`Failed to remove emoji reaction`)))
      } else {
        if (hasReachedReactionLimit(message, currentAccount?.userId)) return
        convo
          .addReaction(message.id, emoji)
          .catch(() =>
            Toast.show(_(msg`Failed to add emoji reaction`), 'xmark'),
          )
      }
    },
    [_, convo, message, currentAccount?.userId],
  )

  const sender = convo.convo.members.find(
    member => member.userId === message.sender.userId,
  )

  return (
    <>
      <ContextMenu.Root>
        {isNative && (
          <ContextMenu.AuxiliaryView align={isFromSelf ? 'right' : 'left'}>
            <EmojiReactionPicker
              message={message}
              onEmojiSelect={onEmojiSelect}
            />
          </ContextMenu.AuxiliaryView>
        )}

        <ContextMenu.Trigger
          label={_(msg`Message options`)}
          contentLabel={_(
            msg`Message from @${
              sender?.username ?? 'unknown' // should always be defined
            }: ${message.text}`,
          )}>
          {children}
        </ContextMenu.Trigger>

        <ContextMenu.Outer align={isFromSelf ? 'right' : 'left'}>
          {/* Reply Action */}
          {onReply && (
            <ContextMenu.Item
              testID="messageDropdownReplyBtn"
              label={_(msg`Reply`)}
              onPress={onReply}>
              <ContextMenu.ItemText>{_(msg`Reply`)}</ContextMenu.ItemText>
              <ContextMenu.ItemIcon icon={ReplyIcon} position="right" />
            </ContextMenu.Item>
          )}

          {/* Edit Action (only for own messages) */}
          {isFromSelf && onEdit && (
            <ContextMenu.Item
              testID="messageDropdownEditBtn"
              label={_(msg`Edit`)}
              onPress={onEdit}>
              <ContextMenu.ItemText>{_(msg`Edit`)}</ContextMenu.ItemText>
              <ContextMenu.ItemIcon icon={EditIcon} position="right" />
            </ContextMenu.Item>
          )}

          {/* Pin Action */}
          {onPin && (
            <ContextMenu.Item
              testID="messageDropdownPinBtn"
              label={_(msg`Pin message`)}
              onPress={onPin}>
              <ContextMenu.ItemText>{_(msg`Pin message`)}</ContextMenu.ItemText>
              <ContextMenu.ItemIcon icon={PinIcon} position="right" />
            </ContextMenu.Item>
          )}

          {message.text.length > 0 && (
            <>
              <ContextMenu.Divider />
              <ContextMenu.Item
                testID="messageDropdownTranslateBtn"
                label={_(msg`Translate`)}
                onPress={onPressTranslateMessage}>
                <ContextMenu.ItemText>{_(msg`Translate`)}</ContextMenu.ItemText>
                <ContextMenu.ItemIcon icon={Translate} position="right" />
              </ContextMenu.Item>
              <ContextMenu.Item
                testID="messageDropdownCopyBtn"
                label={_(msg`Copy message text`)}
                onPress={onCopyMessage}>
                <ContextMenu.ItemText>
                  {_(msg`Copy message text`)}
                </ContextMenu.ItemText>
                <ContextMenu.ItemIcon icon={ClipboardIcon} position="right" />
              </ContextMenu.Item>
            </>
          )}
          
          <ContextMenu.Divider />
          
          {/* Delete Action */}
          <ContextMenu.Item
            testID="messageDropdownDeleteBtn"
            label={_(msg`Delete message for me`)}
            onPress={() => deleteControl.open()}>
            <ContextMenu.ItemText>{_(msg`Delete for me`)}</ContextMenu.ItemText>
            <ContextMenu.ItemIcon icon={Trash} position="right" />
          </ContextMenu.Item>
          
          {/* Report Action (only for others' messages) */}
          {!isFromSelf && (
            <ContextMenu.Item
              testID="messageDropdownReportBtn"
              label={_(msg`Report message`)}
              onPress={() => reportControl.open()}>
              <ContextMenu.ItemText>{_(msg`Report`)}</ContextMenu.ItemText>
              <ContextMenu.ItemIcon icon={Warning} position="right" />
            </ContextMenu.Item>
          )}
        </ContextMenu.Outer>
      </ContextMenu.Root>

      <ReportDialog
        currentScreen="conversation"
        params={{type: 'convoMessage', convoId: convo.convo.id, message}}
        control={reportControl}
      />

      <Prompt.Basic
        control={deleteControl}
        title={_(msg`Delete message`)}
        description={_(
          msg`Are you sure you want to delete this message? The message will be deleted for you, but not for the other participant.`,
        )}
        confirmButtonCta={_(msg`Delete`)}
        confirmButtonColor="negative"
        onConfirm={handleDelete}
      />
    </>
  )
}
MessageContextMenu = memo(MessageContextMenu)
