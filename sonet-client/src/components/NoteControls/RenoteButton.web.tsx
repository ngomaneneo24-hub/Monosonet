import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {useRequireAuth} from '#/state/session'
import {useSession} from '#/state/session'
import {EventStopper} from '#/view/com/util/EventStopper'
import {formatCount} from '#/view/com/util/numeric/format'
import {useTheme} from '#/alf'
import {CloseQuote_Stroke2_Corner1_Rounded as Quote} from '#/components/icons/Quote'
import {Renote_Stroke2_Corner2_Rounded as Renote} from '#/components/icons/Renote'
import * as Menu from '#/components/Menu'
import {
  NoteControlButton,
  NoteControlButtonIcon,
  NoteControlButtonText,
} from './NoteControlButton'

interface Props {
  isRenoteed: boolean
  renoteCount?: number
  onRenote: () => void
  onQuote: () => void
  big?: boolean
  embeddingDisabled: boolean
}

export const RenoteButton = ({
  isRenoteed,
  renoteCount,
  onRenote,
  onQuote,
  big,
  embeddingDisabled,
}: Props) => {
  const t = useTheme()
  const {_, i18n} = useLingui()
  const {hasSession} = useSession()
  const requireAuth = useRequireAuth()

  return hasSession ? (
    <EventStopper onKeyDown={false}>
      <Menu.Root>
        <Menu.Trigger label={_(msg`Renote or quote note`)}>
          {({props}) => {
            return (
              <NoteControlButton
                testID="renoteBtn"
                active={isRenoteed}
                activeColor={t.palette.positive_600}
                label={props.accessibilityLabel}
                big={big}
                {...props}>
                <NoteControlButtonIcon icon={Renote} />
                {typeof renoteCount !== 'undefined' && renoteCount > 0 && (
                  <NoteControlButtonText testID="renoteCount">
                    {formatCount(i18n, renoteCount)}
                  </NoteControlButtonText>
                )}
              </NoteControlButton>
            )
          }}
        </Menu.Trigger>
        <Menu.Outer style={{minWidth: 170}}>
          <Menu.Item
            label={
              isRenoteed
                ? _(msg`Undo renote`)
                : _(msg({message: `Renote`, context: `action`}))
            }
            testID="renoteDropdownRenoteBtn"
            onPress={onRenote}>
            <Menu.ItemText>
              {isRenoteed
                ? _(msg`Undo renote`)
                : _(msg({message: `Renote`, context: `action`}))}
            </Menu.ItemText>
            <Menu.ItemIcon icon={Renote} position="right" />
          </Menu.Item>
          <Menu.Item
            disabled={embeddingDisabled}
            label={
              embeddingDisabled
                ? _(msg`Quote notes disabled`)
                : _(msg`Quote note`)
            }
            testID="renoteDropdownQuoteBtn"
            onPress={onQuote}>
            <Menu.ItemText>
              {embeddingDisabled
                ? _(msg`Quote notes disabled`)
                : _(msg`Quote note`)}
            </Menu.ItemText>
            <Menu.ItemIcon icon={Quote} position="right" />
          </Menu.Item>
        </Menu.Outer>
      </Menu.Root>
    </EventStopper>
  ) : (
    <NoteControlButton
      onPress={() => requireAuth(() => {})}
      active={isRenoteed}
      activeColor={t.palette.positive_600}
      label={_(msg`Renote or quote note`)}
      big={big}>
      <NoteControlButtonIcon icon={Renote} />
      {typeof renoteCount !== 'undefined' && renoteCount > 0 && (
        <NoteControlButtonText testID="renoteCount">
          {formatCount(i18n, renoteCount)}
        </NoteControlButtonText>
      )}
    </NoteControlButton>
  )
}
