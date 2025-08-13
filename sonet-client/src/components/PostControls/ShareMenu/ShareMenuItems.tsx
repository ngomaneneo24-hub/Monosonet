import {memo, useMemo} from 'react'
import * as ExpoClipboard from 'expo-clipboard'
import {AtUri} from '@sonet/api'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useNavigation} from '@react-navigation/native'

import {makeProfileLink} from '#/lib/routes/links'
import {type NavigationProp} from '#/lib/routes/types'
import {shareText, shareUrl} from '#/lib/sharing'
import {toShareUrl} from '#/lib/strings/url-helpers'
import {logger} from '#/logger'
import {isIOS} from '#/platform/detection'
import {useAgeAssurance} from '#/state/ageAssurance/useAgeAssurance'
import {useProfileShadow} from '#/state/cache/profile-shadow'
import {useSession} from '#/state/session'
import * as Toast from '#/view/com/util/Toast'
import {atoms as a} from '#/alf'
import {Admonition} from '#/components/Admonition'
import {useDialogControl} from '#/components/Dialog'
import {SendViaChatDialog} from '#/components/dms/dialogs/ShareViaChatDialog'
import {ArrowOutOfBoxModified_Stroke2_Corner2_Rounded as ArrowOutOfBoxIcon} from '#/components/icons/ArrowOutOfBox'
import {ChainLink_Stroke2_Corner0_Rounded as ChainLinkIcon} from '#/components/icons/ChainLink'
import {Clipboard_Stroke2_Corner2_Rounded as ClipboardIcon} from '#/components/icons/Clipboard'
import {PaperPlane_Stroke2_Corner0_Rounded as PaperPlaneIcon} from '#/components/icons/PaperPlane'
import * as Menu from '#/components/Menu'
import {useDevMode} from '#/storage/hooks/dev-mode'
import {RecentChats} from './RecentChats'
import {type ShareMenuItemsProps} from './ShareMenuItems.types'

let ShareMenuItems = ({
  note,
  onShare: onShareProp,
}: ShareMenuItemsProps): React.ReactNode => {
  const {hasSession} = useSession()
  const {_} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const sendViaChatControl = useDialogControl()
  const [devModeEnabled] = useDevMode()
  const {isAgeRestricted} = useAgeAssurance()

  const noteUri = note.uri
  const noteAuthor = useProfileShadow(note.author)

  const href = useMemo(() => {
    const urip = new AtUri(noteUri)
    return makeProfileLink(noteAuthor, 'note', urip.rkey)
  }, [noteUri, noteAuthor])

  const hideInPWI = useMemo(() => {
    return !!noteAuthor.labels?.find(
      label => label.val === '!no-unauthenticated',
    )
  }, [noteAuthor])

  const onShareNote = () => {
    logger.metric('share:press:nativeShare', {}, {statsig: true})
    const url = toShareUrl(href)
    shareUrl(url)
    onShareProp()
  }

  const onCopyLink = async () => {
    logger.metric('share:press:copyLink', {}, {statsig: true})
    const url = toShareUrl(href)
    if (isIOS) {
      // iOS only
      await ExpoClipboard.setUrlAsync(url)
    } else {
      await ExpoClipboard.setStringAsync(url)
    }
    Toast.show(_(msg`Copied to clipboard`), 'clipboard-check')
    onShareProp()
  }

  const onSelectChatToShareTo = (conversation: string) => {
    navigation.navigate('MessagesConversation', {
      conversation,
      embed: noteUri,
    })
  }

  const onShareATURI = () => {
    shareText(noteUri)
  }

  const onShareAuthorUserID = () => {
    shareText(noteAuthor.userId)
  }

  return (
    <>
      <Menu.Outer>
        {hasSession && !isAgeRestricted && (
          <Menu.Group>
            <Menu.ContainerItem>
              <RecentChats noteUri={noteUri} />
            </Menu.ContainerItem>
            <Menu.Item
              testID="noteDropdownSendViaDMBtn"
              label={_(msg`Send via direct message`)}
              onPress={() => {
                logger.metric('share:press:openDmSearch', {}, {statsig: true})
                sendViaChatControl.open()
              }}>
              <Menu.ItemText>
                <Trans>Send via direct message</Trans>
              </Menu.ItemText>
              <Menu.ItemIcon icon={PaperPlaneIcon} position="right" />
            </Menu.Item>
          </Menu.Group>
        )}

        <Menu.Group>
          <Menu.Item
            testID="noteDropdownShareBtn"
            label={_(msg`Share via...`)}
            onPress={onShareNote}>
            <Menu.ItemText>
              <Trans>Share via...</Trans>
            </Menu.ItemText>
            <Menu.ItemIcon icon={ArrowOutOfBoxIcon} position="right" />
          </Menu.Item>

          <Menu.Item
            testID="noteDropdownShareBtn"
            label={_(msg`Copy link to note`)}
            onPress={onCopyLink}>
            <Menu.ItemText>
              <Trans>Copy link to note</Trans>
            </Menu.ItemText>
            <Menu.ItemIcon icon={ChainLinkIcon} position="right" />
          </Menu.Item>
        </Menu.Group>

        {hideInPWI && (
          <Menu.Group>
            <Menu.ContainerItem>
              <Admonition type="warning" style={[a.flex_1, a.border_0, a.p_0]}>
                <Trans>This note is only visible to logged-in users.</Trans>
              </Admonition>
            </Menu.ContainerItem>
          </Menu.Group>
        )}

        {devModeEnabled && (
          <Menu.Group>
            <Menu.Item
              testID="noteAtUriShareBtn"
              label={_(msg`Share note sonet:// URI`)}
              onPress={onShareATURI}>
              <Menu.ItemText>
                <Trans>Share note sonet:// URI</Trans>
              </Menu.ItemText>
              <Menu.ItemIcon icon={ClipboardIcon} position="right" />
            </Menu.Item>
            <Menu.Item
              testID="noteAuthorUserIDShareBtn"
              label={_(msg`Share author UserID`)}
              onPress={onShareAuthorUserID}>
              <Menu.ItemText>
                <Trans>Share author UserID</Trans>
              </Menu.ItemText>
              <Menu.ItemIcon icon={ClipboardIcon} position="right" />
            </Menu.Item>
          </Menu.Group>
        )}
      </Menu.Outer>

      <SendViaChatDialog
        control={sendViaChatControl}
        onSelectChat={onSelectChatToShareTo}
      />
    </>
  )
}
ShareMenuItems = memo(ShareMenuItems)
export {ShareMenuItems}
