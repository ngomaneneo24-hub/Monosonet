import {memo, useCallback} from 'react'
import {View} from 'react-native'
import {msg, plural, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {useHaptics} from '#/lib/haptics'
import {useRequireAuth} from '#/state/session'
import {formatCount} from '#/view/com/util/numeric/format'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {CloseQuote_Stroke2_Corner1_Rounded as Quote} from '#/components/icons/Quote'
import {Renote_Stroke2_Corner2_Rounded as Renote} from '#/components/icons/Renote'
import {Text} from '#/components/Typography'
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

let RenoteButton = ({
  isRenoteed,
  renoteCount,
  onRenote,
  onQuote,
  big,
  embeddingDisabled,
}: Props): React.ReactNode => {
  const t = useTheme()
  const {_, i18n} = useLingui()
  const requireAuth = useRequireAuth()
  const dialogControl = Dialog.useDialogControl()

  const onPress = () => requireAuth(() => dialogControl.open())

  const onLongPress = () =>
    requireAuth(() => {
      if (embeddingDisabled) {
        dialogControl.open()
      } else {
        onQuote()
      }
    })

  return (
    <>
      <NoteControlButton
        testID="renoteBtn"
        active={isRenoteed}
        activeColor={t.palette.positive_600}
        big={big}
        onPress={onPress}
        onLongPress={onLongPress}
        label={
          isRenoteed
            ? _(
                msg({
                  message: `Undo renote (${plural(renoteCount || 0, {
                    one: '# renote',
                    other: '# renotes',
                  })})`,
                  comment:
                    'Accessibility label for the renote button when the note has been renoteed, verb followed by number of renotes and noun',
                }),
              )
            : _(
                msg({
                  message: `Renote (${plural(renoteCount || 0, {
                    one: '# renote',
                    other: '# renotes',
                  })})`,
                  comment:
                    'Accessibility label for the renote button when the note has not been renoteed, verb form followed by number of renotes and noun form',
                }),
              )
        }>
        <NoteControlButtonIcon icon={Renote} />
        {typeof renoteCount !== 'undefined' && renoteCount > 0 && (
          <NoteControlButtonText testID="renoteCount">
            {formatCount(i18n, renoteCount)}
          </NoteControlButtonText>
        )}
      </NoteControlButton>
      <Dialog.Outer
        control={dialogControl}
        nativeOptions={{preventExpansion: true}}>
        <Dialog.Username />
        <RenoteButtonDialogInner
          isRenoteed={isRenoteed}
          onRenote={onRenote}
          onQuote={onQuote}
          embeddingDisabled={embeddingDisabled}
        />
      </Dialog.Outer>
    </>
  )
}
RenoteButton = memo(RenoteButton)
export {RenoteButton}

let RenoteButtonDialogInner = ({
  isRenoteed,
  onRenote,
  onQuote,
  embeddingDisabled,
}: {
  isRenoteed: boolean
  onRenote: () => void
  onQuote: () => void
  embeddingDisabled: boolean
}): React.ReactNode => {
  const t = useTheme()
  const {_} = useLingui()
  const playHaptic = useHaptics()
  const control = Dialog.useDialogContext()

  const onPressRenote = useCallback(() => {
    if (!isRenoteed) playHaptic()

    control.close(() => {
      onRenote()
    })
  }, [control, isRenoteed, onRenote, playHaptic])

  const onPressQuote = useCallback(() => {
    playHaptic()
    control.close(() => {
      onQuote()
    })
  }, [control, onQuote, playHaptic])

  const onPressClose = useCallback(() => control.close(), [control])

  return (
    <Dialog.ScrollableInner label={_(msg`Renote or quote note`)}>
      <View style={a.gap_xl}>
        <View style={a.gap_xs}>
          <Button
            style={[a.justify_start, a.px_md]}
            label={
              isRenoteed
                ? _(msg`Remove renote`)
                : _(msg({message: `Renote`, context: 'action'}))
            }
            onPress={onPressRenote}
            size="large"
            variant="ghost"
            color="primary">
            <Renote size="lg" fill={t.palette.primary_500} />
            <Text style={[a.font_bold, a.text_xl]}>
              {isRenoteed ? (
                <Trans>Remove renote</Trans>
              ) : (
                <Trans context="action">Renote</Trans>
              )}
            </Text>
          </Button>
          <Button
            disabled={embeddingDisabled}
            testID="quoteBtn"
            style={[a.justify_start, a.px_md]}
            label={
              embeddingDisabled
                ? _(msg`Quote notes disabled`)
                : _(msg`Quote note`)
            }
            onPress={onPressQuote}
            size="large"
            variant="ghost"
            color="primary">
            <Quote
              size="lg"
              fill={
                embeddingDisabled
                  ? t.atoms.text_contrast_low.color
                  : t.palette.primary_500
              }
            />
            <Text
              style={[
                a.font_bold,
                a.text_xl,
                embeddingDisabled && t.atoms.text_contrast_low,
              ]}>
              {embeddingDisabled ? (
                <Trans>Quote notes disabled</Trans>
              ) : (
                <Trans>Quote note</Trans>
              )}
            </Text>
          </Button>
        </View>
        <Button
          label={_(msg`Cancel quote note`)}
          onPress={onPressClose}
          size="large"
          variant="outline"
          color="primary">
          <ButtonText>
            <Trans>Cancel</Trans>
          </ButtonText>
        </Button>
      </View>
    </Dialog.ScrollableInner>
  )
}
RenoteButtonDialogInner = memo(RenoteButtonDialogInner)
export {RenoteButtonDialogInner}
