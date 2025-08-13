import {useCallback} from 'react'
import {useFocusEffect} from '@react-navigation/native'

import {
  type CommonNavigatorParams,
  type NativeStackScreenProps,
} from '#/lib/routes/types'
import {useGate} from '#/lib/statsig/statsig'
import {makeRecordUri} from '#/lib/strings/url-helpers'
import {useSetMinimalShellMode} from '#/state/shell'
import {NoteThread as NoteThreadComponent} from '#/view/com/note-thread/NoteThread'
import {NoteThread} from '#/screens/NoteThread'
import * as Layout from '#/components/Layout'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'NoteThread'>
export function NoteThreadScreen({route}: Props) {
  const setMinimalShellMode = useSetMinimalShellMode()
  const gate = useGate()

  const {name, rkey} = route.params
  const uri = makeRecordUri(name, 'app.sonet.feed.note', rkey)

  useFocusEffect(
    useCallback(() => {
      setMinimalShellMode(false)
    }, [setMinimalShellMode]),
  )

  return (
    <Layout.Screen testID="noteThreadScreen">
      {gate('note_threads_v2_unspecced') || __DEV__ ? (
        <NoteThread uri={uri} />
      ) : (
        <NoteThreadComponent uri={uri} />
      )}
    </Layout.Screen>
  )
}
