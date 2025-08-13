import React from 'react'
import {Plural, Trans} from '@lingui/macro'
import {useFocusEffect} from '@react-navigation/native'

import {CommonNavigatorParams, NativeStackScreenProps} from '#/lib/routes/types'
import {makeRecordUri} from '#/lib/strings/url-helpers'
import {useNoteThreadQuery} from '#/state/queries/note-thread'
import {useSetMinimalShellMode} from '#/state/shell'
import {NoteLikedBy as NoteLikedByComponent} from '#/view/com/note-thread/NoteLikedBy'
import * as Layout from '#/components/Layout'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'NoteLikedBy'>
export const NoteLikedByScreen = ({route}: Props) => {
  const setMinimalShellMode = useSetMinimalShellMode()
  const {name, rkey} = route.params
  const uri = makeRecordUri(name, 'app.sonet.feed.note', rkey)
  const {data: note} = useNoteThreadQuery(uri)

  let likeCount
  if (note?.thread.type === 'note') {
    likeCount = note.thread.note.likeCount
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
                <Trans>Liked By</Trans>
              </Layout.Header.TitleText>
              <Layout.Header.SubtitleText>
                <Plural value={likeCount ?? 0} one="# like" other="# likes" />
              </Layout.Header.SubtitleText>
            </>
          )}
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <NoteLikedByComponent uri={uri} />
    </Layout.Screen>
  )
}
