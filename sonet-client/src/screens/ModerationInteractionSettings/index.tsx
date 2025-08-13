import React from 'react'
import {View} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import deepEqual from 'lodash.isequal'

import {logger} from '#/logger'
import {useNoteInteractionSettingsMutation} from '#/state/queries/note-interaction-settings'
import {createNotegateRecord} from '#/state/queries/notegate/util'
import {
  usePreferencesQuery,
  UsePreferencesQueryResponse,
} from '#/state/queries/preferences'
import {
  threadgateAllowUISettingToAllowRecordValue,
  threadgateRecordToAllowUISetting,
} from '#/state/queries/threadgate'
import * as Toast from '#/view/com/util/Toast'
import {atoms as a, useGutters} from '#/alf'
import {Admonition} from '#/components/Admonition'
import {NoteInteractionSettingsForm} from '#/components/dialogs/NoteInteractionSettingsDialog'
import * as Layout from '#/components/Layout'
import {Loader} from '#/components/Loader'

export function Screen() {
  const gutters = useGutters(['base'])
  const {data: preferences} = usePreferencesQuery()
  return (
    <Layout.Screen testID="ModerationInteractionSettingsScreen">
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Note Interaction Settings</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <Layout.Content>
        <View style={[gutters, a.gap_xl]}>
          <Admonition type="tip">
            <Trans>
              The following settings will be used as your defaults when creating
              new notes. You can edit these for a specific note from the
              composer.
            </Trans>
          </Admonition>
          {preferences ? (
            <Inner preferences={preferences} />
          ) : (
            <View style={[gutters, a.justify_center, a.align_center]}>
              <Loader size="xl" />
            </View>
          )}
        </View>
      </Layout.Content>
    </Layout.Screen>
  )
}

function Inner({preferences}: {preferences: UsePreferencesQueryResponse}) {
  const {_} = useLingui()
  const {mutateAsync: setNoteInteractionSettings, isPending} =
    useNoteInteractionSettingsMutation()
  const [error, setError] = React.useState<string | undefined>(undefined)

  const allowUI = React.useMemo(() => {
    return threadgateRecordToAllowUISetting({
      type: "sonet",
      note: '',
      createdAt: new Date().toString(),
      allow: preferences.noteInteractionSettings.threadgateAllowRules,
    })
  }, [preferences.noteInteractionSettings.threadgateAllowRules])
  const notegate = React.useMemo(() => {
    return createNotegateRecord({
      note: '',
      embeddingRules:
        preferences.noteInteractionSettings.notegateEmbeddingRules,
    })
  }, [preferences.noteInteractionSettings.notegateEmbeddingRules])

  const [maybeEditedAllowUI, setAllowUI] = React.useState(allowUI)
  const [maybeEditedNotegate, setEditedNotegate] = React.useState(notegate)

  const wasEdited = React.useMemo(() => {
    return (
      !deepEqual(allowUI, maybeEditedAllowUI) ||
      !deepEqual(notegate.embeddingRules, maybeEditedNotegate.embeddingRules)
    )
  }, [notegate, allowUI, maybeEditedAllowUI, maybeEditedNotegate])

  const onSave = React.useCallback(async () => {
    setError('')

    try {
      await setNoteInteractionSettings({
        threadgateAllowRules:
          threadgateAllowUISettingToAllowRecordValue(maybeEditedAllowUI),
        notegateEmbeddingRules: maybeEditedNotegate.embeddingRules ?? [],
      })
      Toast.show(_(msg({message: 'Settings saved', context: 'toast'})))
    } catch (e: any) {
      logger.error(`Failed to save note interaction settings`, {
        source: 'ModerationInteractionSettingsScreen',
        safeMessage: e.message,
      })
      setError(_(msg`Failed to save settings. Please try again.`))
    }
  }, [_, maybeEditedNotegate, maybeEditedAllowUI, setNoteInteractionSettings])

  return (
    <>
      <NoteInteractionSettingsForm
        canSave={wasEdited}
        isSaving={isPending}
        onSave={onSave}
        notegate={maybeEditedNotegate}
        onChangeNotegate={setEditedNotegate}
        threadgateAllowUISettings={maybeEditedAllowUI}
        onChangeThreadgateAllowUISettings={setAllowUI}
      />

      {error && <Admonition type="error">{error}</Admonition>}
    </>
  )
}
