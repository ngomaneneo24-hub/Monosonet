import React from 'react'
import {Plural, Trans} from '@lingui/macro'
import {useFocusEffect} from '@react-navigation/native'

import {CommonNavigatorParams, NativeStackScreenProps} from '#/lib/routes/types'
import {makeRecordUri} from '#/lib/strings/url-helpers'
import {useNoteThreadQuery} from '#/state/queries/note-thread'
import {useSetMinimalShellMode} from '#/state/shell'
import {NoteRenoteedBy as NoteRenoteedByComponent} from '#/view/com/note-thread/NoteRenoteedBy'
import * as Layout from '#/components/Layout'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'NoteRenoteedBy'>
export const NoteRenoteedByScreen = ({route}: Props) => {
  const {name, rkey} = route.params
  const uri = makeRecordUri(name, 'app.sonet.feed.note', rkey)
  const setMinimalShellMode = useSetMinimalShellMode()
  const {data: note} = useNoteThreadQuery(uri)

  let quoteCount
  if (note?.thread.type === 'note') {
    quoteCount = note.thread.note.renoteCount
  }

  useFocusEffect(
    React.useCallback(() => {
      setMinimalShellMode(false)
    }, [setMinimalShellMode]),
  )

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          {note && (
            <>
              <Layout.Header.TitleText>
                <Trans>Renoteed By</Trans>
              </Layout.Header.TitleText>
              <Layout.Header.SubtitleText>
                <Plural
                  value={quoteCount ?? 0}
                  one="# renote"
                  other="# renotes"
                />
              </Layout.Header.SubtitleText>
            </>
          )}
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <NoteRenoteedByComponent uri={uri} />
    </Layout.Screen>
  )
}
