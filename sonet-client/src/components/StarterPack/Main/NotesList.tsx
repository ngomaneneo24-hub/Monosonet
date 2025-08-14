import React, {useCallback} from 'react'
import {View} from 'react-native'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {isNative} from '#/platform/detection'
import {FeedDescriptor} from '#/state/queries/note-feed'
import {NoteFeed} from '#/view/com/notes/NoteFeed'
import {EmptyState} from '#/view/com/util/EmptyState'
import {ListRef} from '#/view/com/util/List'
import {SectionRef} from '#/screens/Profile/Sections/types'

interface ProfilesListProps {
  listUri: string
  headerHeight: number
  scrollElRef: ListRef
}

export const NotesList = React.forwardRef<SectionRef, ProfilesListProps>(
  function NotesListImpl({listUri, headerHeight, scrollElRef}, ref) {
    const feed: FeedDescriptor = `list|${listUri}`
    const {_} = useLingui()

    const onScrollToTop = useCallback(() => {
      scrollElRef.current?.scrollToOffset({
        animated: isNative,
        offset: -headerHeight,
      })
    }, [scrollElRef, headerHeight])

    React.useImperativeHandle(ref, () => ({
      scrollToTop: onScrollToTop,
    }))

    const renderNotesEmpty = useCallback(() => {
      return <EmptyState icon="hashtag" message={_(msg`This feed is empty.`)} />
    }, [_])

    return (
      <View>
        <NoteFeed
          feed={feed}
          pollInterval={60e3}
          scrollElRef={scrollElRef}
          renderEmptyState={renderNotesEmpty}
          headerOffset={headerHeight}
        />
      </View>
    )
  },
)
