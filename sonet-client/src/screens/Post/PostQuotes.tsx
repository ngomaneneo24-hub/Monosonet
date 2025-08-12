import React from 'react'
import {Plural, Trans} from '@lingui/macro'
import {useFocusEffect} from '@react-navigation/native'

import {CommonNavigatorParams, NativeStackScreenProps} from '#/lib/routes/types'
import {makeRecordUri} from '#/lib/strings/url-helpers'
import {useNoteThreadQuery} from '#/state/queries/note-thread'
import {useSetMinimalShellMode} from '#/state/shell'
import {NoteQuotes as NoteQuotesComponent} from '#/view/com/note-thread/NoteQuotes'
import * as Layout from '#/components/Layout'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'NoteQuotes'>
export const NoteQuotesScreen = ({route}: Props) => {
  const setMinimalShellMode = useSetMinimalShellMode()
  const {name, rkey} = route.params
  const uri = makeRecordUri(name, 'app.sonet.feed.note', rkey)
  const {data: note} = useNoteThreadQuery(uri)

  let quoteCount
  if (note?.thread.type === 'note') {
    quoteCount = note.thread.note.quoteCount
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
                <Trans>Quotes</Trans>
              </Layout.Header.TitleText>
              <Layout.Header.SubtitleText>
                <Plural
                  value={quoteCount ?? 0}
                  one="# quote"
                  other="# quotes"
                />
              </Layout.Header.SubtitleText>
            </>
          )}
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <NoteQuotesComponent uri={uri} />
    </Layout.Screen>
  )
}
