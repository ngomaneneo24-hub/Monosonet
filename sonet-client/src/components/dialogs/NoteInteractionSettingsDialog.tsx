import React from 'react'
import {type StyleProp, View, type ViewStyle} from 'react-native'
import {
  type SonetFeedDefs,
  type SonetFeedNotegate,
  AtUri,
} from '@sonet/api'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useQueryClient} from '@tanstack/react-query'
import isEqual from 'lodash.isequal'

import {logger} from '#/logger'
import {STALE} from '#/state/queries'
import {useMyListsQuery} from '#/state/queries/my-lists'
import {
  createNotegateQueryKey,
  getNotegateRecord,
  useNotegateQuery,
  useWriteNotegateMutation,
} from '#/state/queries/notegate'
import {
  createNotegateRecord,
  embeddingRules,
} from '#/state/queries/notegate/util'
import {
  createThreadgateViewQueryKey,
  getThreadgateView,
  type ThreadgateAllowUISetting,
  threadgateViewToAllowUISetting,
  useSetThreadgateAllowMutation,
  useThreadgateViewQuery,
} from '#/state/queries/threadgate'
import {useAgent, useSession} from '#/state/session'
import * as Toast from '#/view/com/util/Toast'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {Divider} from '#/components/Divider'
import * as Toggle from '#/components/forms/Toggle'
import {Check_Stroke2_Corner0_Rounded as Check} from '#/components/icons/Check'
import {CircleInfo_Stroke2_Corner0_Rounded as CircleInfo} from '#/components/icons/CircleInfo'
import {Loader} from '#/components/Loader'
import {Text} from '#/components/Typography'

export type NoteInteractionSettingsFormProps = {
  canSave?: boolean
  onSave: () => void
  isSaving?: boolean

  notegate: SonetFeedNotegate.Record
  onChangeNotegate: (v: SonetFeedNotegate.Record) => void

  threadgateAllowUISettings: ThreadgateAllowUISetting[]
  onChangeThreadgateAllowUISettings: (v: ThreadgateAllowUISetting[]) => void

  replySettingsDisabled?: boolean
}

export function NoteInteractionSettingsControlledDialog({
  control,
  ...rest
}: NoteInteractionSettingsFormProps & {
  control: Dialog.DialogControlProps
}) {
  const t = useTheme()
  const {_} = useLingui()

  return (
    <Dialog.Outer control={control}>
      <Dialog.Username />
      <Dialog.ScrollableInner
        label={_(msg`Edit note interaction settings`)}
        style={[{maxWidth: 500}, a.w_full]}>
        <View style={[a.gap_md]}>
          <Header />
          <NoteInteractionSettingsForm {...rest} />
          <Text
            style={[
              a.pt_sm,
              a.text_sm,
              a.leading_snug,
              t.atoms.text_contrast_medium,
            ]}>
            <Trans>
              You can set default interaction settings in{' '}
              <Text style={[a.font_bold, t.atoms.text_contrast_medium]}>
                Settings &rarr; Moderation &rarr; Interaction settings
              </Text>
              .
            </Trans>
          </Text>
        </View>
        <Dialog.Close />
      </Dialog.ScrollableInner>
    </Dialog.Outer>
  )
}

export function Header() {
  return (
    <View style={[a.gap_md, a.pb_sm]}>
      <Text style={[a.text_2xl, a.font_bold]}>
        <Trans>Note interaction settings</Trans>
      </Text>
      <Text style={[a.text_md, a.pb_xs]}>
        <Trans>Customize who can interact with this note.</Trans>
      </Text>
      <Divider />
    </View>
  )
}

export type NoteInteractionSettingsDialogProps = {
  control: Dialog.DialogControlProps
  /**
   * URI of the note to edit the interaction settings for. Could be a root note
   * or could be a reply.
   */
  noteUri: string
  /**
   * The URI of the root note in the thread. Used to determine if the viewer
   * owns the threadgate record and can therefore edit it.
   */
  rootNoteUri: string
  /**
   * Optional initial {@link SonetFeedDefs.ThreadgateView} to use if we
   * happen to have one before opening the settings dialog.
   */
  initialThreadgateView?: SonetFeedDefs.ThreadgateView
}

export function NoteInteractionSettingsDialog(
  props: NoteInteractionSettingsDialogProps,
) {
  return (
    <Dialog.Outer control={props.control}>
      <Dialog.Username />
      <NoteInteractionSettingsDialogControlledInner {...props} />
    </Dialog.Outer>
  )
}

export function NoteInteractionSettingsDialogControlledInner(
  props: NoteInteractionSettingsDialogProps,
) {
  const {_} = useLingui()
  const {currentAccount} = useSession()
  const [isSaving, setIsSaving] = React.useState(false)

  const {data: threadgateViewLoaded, isLoading: isLoadingThreadgate} =
    useThreadgateViewQuery({noteUri: props.rootNoteUri})
  const {data: notegate, isLoading: isLoadingNotegate} = useNotegateQuery({
    noteUri: props.noteUri,
  })

  const {mutateAsync: writeNotegateRecord} = useWriteNotegateMutation()
  const {mutateAsync: setThreadgateAllow} = useSetThreadgateAllowMutation()

  const [editedNotegate, setEditedNotegate] =
    React.useState<SonetFeedNotegate.Record>()
  const [editedAllowUISettings, setEditedAllowUISettings] =
    React.useState<ThreadgateAllowUISetting[]>()

  const isLoading = isLoadingThreadgate || isLoadingNotegate
  const threadgateView = threadgateViewLoaded || props.initialThreadgateView
  const isThreadgateOwnedByViewer = React.useMemo(() => {
    return currentAccount?.userId === new AtUri(props.rootNoteUri).host
  }, [props.rootNoteUri, currentAccount?.userId])

  const notegateValue = React.useMemo(() => {
    return (
      editedNotegate || notegate || createNotegateRecord({note: props.noteUri})
    )
  }, [notegate, editedNotegate, props.noteUri])
  const allowUIValue = React.useMemo(() => {
    return (
      editedAllowUISettings || threadgateViewToAllowUISetting(threadgateView)
    )
  }, [threadgateView, editedAllowUISettings])

  const onSave = React.useCallback(async () => {
    if (!editedNotegate && !editedAllowUISettings) {
      props.control.close()
      return
    }

    setIsSaving(true)

    try {
      const requests = []

      if (editedNotegate) {
        requests.push(
          writeNotegateRecord({
            noteUri: props.noteUri,
            notegate: editedNotegate,
          }),
        )
      }

      if (editedAllowUISettings && isThreadgateOwnedByViewer) {
        requests.push(
          setThreadgateAllow({
            noteUri: props.rootNoteUri,
            allow: editedAllowUISettings,
          }),
        )
      }

      await Promise.all(requests)

      props.control.close()
    } catch (e: any) {
      logger.error(`Failed to save note interaction settings`, {
        source: 'NoteInteractionSettingsDialogControlledInner',
        safeMessage: e.message,
      })
      Toast.show(
        _(
          msg`There was an issue. Please check your internet connection and try again.`,
        ),
        'xmark',
      )
    } finally {
      setIsSaving(false)
    }
  }, [
    _,
    props.noteUri,
    props.rootNoteUri,
    props.control,
    editedNotegate,
    editedAllowUISettings,
    setIsSaving,
    writeNotegateRecord,
    setThreadgateAllow,
    isThreadgateOwnedByViewer,
  ])

  return (
    <Dialog.ScrollableInner
      label={_(msg`Edit note interaction settings`)}
      style={[{maxWidth: 500}, a.w_full]}>
      <View style={[a.gap_md]}>
        <Header />

        {isLoading ? (
          <View style={[a.flex_1, a.py_4xl, a.align_center, a.justify_center]}>
            <Loader size="xl" />
          </View>
        ) : (
          <NoteInteractionSettingsForm
            replySettingsDisabled={!isThreadgateOwnedByViewer}
            isSaving={isSaving}
            onSave={onSave}
            notegate={notegateValue}
            onChangeNotegate={setEditedNotegate}
            threadgateAllowUISettings={allowUIValue}
            onChangeThreadgateAllowUISettings={setEditedAllowUISettings}
          />
        )}
      </View>
    </Dialog.ScrollableInner>
  )
}

export function NoteInteractionSettingsForm({
  canSave = true,
  onSave,
  isSaving,
  notegate,
  onChangeNotegate,
  threadgateAllowUISettings,
  onChangeThreadgateAllowUISettings,
  replySettingsDisabled,
}: NoteInteractionSettingsFormProps) {
  const t = useTheme()
  const {_} = useLingui()
  const {data: lists} = useMyListsQuery('curate')
  const [quotesEnabled, setQuotesEnabled] = React.useState(
    !(
      notegate.embeddingRules &&
      notegate.embeddingRules.find(
        v => v.$type === embeddingRules.disableRule.$type,
      )
    ),
  )

  const onPressAudience = (setting: ThreadgateAllowUISetting) => {
    // remove boolean values
    let newSelected: ThreadgateAllowUISetting[] =
      threadgateAllowUISettings.filter(
        v => v.type !== 'nobody' && v.type !== 'everybody',
      )
    // toggle
    const i = newSelected.findIndex(v => isEqual(v, setting))
    if (i === -1) {
      newSelected.push(setting)
    } else {
      newSelected.splice(i, 1)
    }
    if (newSelected.length === 0) {
      newSelected.push({type: 'everybody'})
    }

    onChangeThreadgateAllowUISettings(newSelected)
  }

  const onChangeQuotesEnabled = React.useCallback(
    (enabled: boolean) => {
      setQuotesEnabled(enabled)
      onChangeNotegate(
        createNotegateRecord({
          ...notegate,
          embeddingRules: enabled ? [] : [embeddingRules.disableRule],
        }),
      )
    },
    [setQuotesEnabled, notegate, onChangeNotegate],
  )

  const noOneCanReply = !!threadgateAllowUISettings.find(
    v => v.type === 'nobody',
  )

  return (
    <View>
      <View style={[a.flex_1, a.gap_md]}>
        <View style={[a.gap_lg]}>
          <View style={[a.gap_sm]}>
            <Text style={[a.font_bold, a.text_lg]}>
              <Trans>Quote settings</Trans>
            </Text>

            <Toggle.Item
              name="quotenotes"
              type="checkbox"
              label={
                quotesEnabled
                  ? _(msg`Click to disable quote notes of this note.`)
                  : _(msg`Click to enable quote notes of this note.`)
              }
              value={quotesEnabled}
              onChange={onChangeQuotesEnabled}
              style={[a.justify_between, a.pt_xs]}>
              <Text style={[t.atoms.text_contrast_medium]}>
                <Trans>Allow quote notes</Trans>
              </Text>
              <Toggle.Switch />
            </Toggle.Item>
          </View>

          <Divider />

          {replySettingsDisabled && (
            <View
              style={[
                a.px_md,
                a.py_sm,
                a.rounded_sm,
                a.flex_row,
                a.align_center,
                a.gap_sm,
                t.atoms.bg_contrast_25,
              ]}>
              <CircleInfo fill={t.atoms.text_contrast_low.color} />
              <Text
                style={[
                  a.flex_1,
                  a.leading_snug,
                  t.atoms.text_contrast_medium,
                ]}>
                <Trans>
                  Reply settings are chosen by the author of the thread
                </Trans>
              </Text>
            </View>
          )}

          <View
            style={[
              a.gap_sm,
              {
                opacity: replySettingsDisabled ? 0.3 : 1,
              },
            ]}>
            <Text style={[a.font_bold, a.text_lg]}>
              <Trans>Reply settings</Trans>
            </Text>

            <Text style={[a.pt_sm, t.atoms.text_contrast_medium]}>
              <Trans>Allow replies from:</Trans>
            </Text>

            <View style={[a.flex_row, a.gap_sm]}>
              <Selectable
                label={_(msg`Everybody`)}
                isSelected={
                  !!threadgateAllowUISettings.find(v => v.type === 'everybody')
                }
                onPress={() =>
                  onChangeThreadgateAllowUISettings([{type: 'everybody'}])
                }
                style={{flex: 1}}
                disabled={replySettingsDisabled}
              />
              <Selectable
                label={_(msg`Nobody`)}
                isSelected={noOneCanReply}
                onPress={() =>
                  onChangeThreadgateAllowUISettings([{type: 'nobody'}])
                }
                style={{flex: 1}}
                disabled={replySettingsDisabled}
              />
            </View>

            {!noOneCanReply && (
              <>
                <Text style={[a.pt_sm, t.atoms.text_contrast_medium]}>
                  <Trans>Or combine these options:</Trans>
                </Text>

                <View style={[a.gap_sm]}>
                  <Selectable
                    label={_(msg`Mentioned users`)}
                    isSelected={
                      !!threadgateAllowUISettings.find(
                        v => v.type === 'mention',
                      )
                    }
                    onPress={() => onPressAudience({type: 'mention'})}
                    disabled={replySettingsDisabled}
                  />
                  <Selectable
                    label={_(msg`Users you follow`)}
                    isSelected={
                      !!threadgateAllowUISettings.find(
                        v => v.type === 'following',
                      )
                    }
                    onPress={() => onPressAudience({type: 'following'})}
                    disabled={replySettingsDisabled}
                  />
                  <Selectable
                    label={_(msg`Your followers`)}
                    isSelected={
                      !!threadgateAllowUISettings.find(
                        v => v.type === 'followers',
                      )
                    }
                    onPress={() => onPressAudience({type: 'followers'})}
                    disabled={replySettingsDisabled}
                  />
                  {lists && lists.length > 0
                    ? lists.map(list => (
                        <Selectable
                          key={list.uri}
                          label={_(msg`Users in "${list.name}"`)}
                          isSelected={
                            !!threadgateAllowUISettings.find(
                              v => v.type === 'list' && v.list === list.uri,
                            )
                          }
                          onPress={() =>
                            onPressAudience({type: 'list', list: list.uri})
                          }
                          disabled={replySettingsDisabled}
                        />
                      ))
                    : // No loading states to avoid jumps for the common case (no lists)
                      null}
                </View>
              </>
            )}
          </View>
        </View>
      </View>

      <Button
        disabled={!canSave || isSaving}
        label={_(msg`Save`)}
        onPress={onSave}
        color="primary"
        size="large"
        variant="solid"
        style={a.mt_xl}>
        <ButtonText>{_(msg`Save`)}</ButtonText>
        {isSaving && <ButtonIcon icon={Loader} position="right" />}
      </Button>
    </View>
  )
}

function Selectable({
  label,
  isSelected,
  onPress,
  style,
  disabled,
}: {
  label: string
  isSelected: boolean
  onPress: () => void
  style?: StyleProp<ViewStyle>
  disabled?: boolean
}) {
  const t = useTheme()
  return (
    <Button
      disabled={disabled}
      onPress={onPress}
      label={label}
      accessibilityRole="checkbox"
      aria-checked={isSelected}
      accessibilityState={{
        checked: isSelected,
      }}
      style={a.flex_1}>
      {({hovered, focused}) => (
        <View
          style={[
            a.flex_1,
            a.flex_row,
            a.align_center,
            a.justify_between,
            a.rounded_sm,
            a.p_md,
            {minHeight: 40}, // for consistency with checkmark icon visible or not
            t.atoms.bg_contrast_50,
            (hovered || focused) && t.atoms.bg_contrast_100,
            isSelected && {
              backgroundColor: t.palette.primary_100,
            },
            style,
          ]}>
          <Text style={[a.text_sm, isSelected && a.font_bold]}>{label}</Text>
          {isSelected ? (
            <Check size="sm" fill={t.palette.primary_500} />
          ) : (
            <View />
          )}
        </View>
      )}
    </Button>
  )
}

export function usePrefetchNoteInteractionSettings({
  noteUri,
  rootNoteUri,
}: {
  noteUri: string
  rootNoteUri: string
}) {
  const queryClient = useQueryClient()
  const agent = useAgent()

  return React.useCallback(async () => {
    try {
      await Promise.all([
        queryClient.prefetchQuery({
          queryKey: createNotegateQueryKey(noteUri),
          queryFn: () =>
            getNotegateRecord({agent, noteUri}).then(res => res ?? null),
          staleTime: STALE.SECONDS.THIRTY,
        }),
        queryClient.prefetchQuery({
          queryKey: createThreadgateViewQueryKey(rootNoteUri),
          queryFn: () => getThreadgateView({agent, noteUri: rootNoteUri}),
          staleTime: STALE.SECONDS.THIRTY,
        }),
      ])
    } catch (e: any) {
      logger.error(`Failed to prefetch note interaction settings`, {
        safeMessage: e.message,
      })
    }
  }, [queryClient, agent, noteUri, rootNoteUri])
}
