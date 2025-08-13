import {View} from 'react-native'
import {SonetEmbedVideo} from '@sonet/api'

import {logEvent} from '#/lib/statsig/statsig'
import {FeedNoteSliceItem} from '#/state/queries/note-feed'
import {VideoFeedSourceContext} from '#/screens/VideoFeed/types'
import {atoms as a, useGutters} from '#/alf'
import * as Grid from '#/components/Grid'
import {
  VideoNoteCard,
  VideoNoteCardPlaceholder,
} from '#/components/VideoNoteCard'

export function NoteFeedVideoGridRow({
  items: slices,
  sourceContext,
}: {
  items: FeedNoteSliceItem[]
  sourceContext: VideoFeedSourceContext
}) {
  const gutters = useGutters(['base', 'base', 0, 'base'])
  const notes = slices
    .filter(slice => SonetEmbedVideo.isView(slice.note.embed))
    .map(slice => ({
      note: slice.note,
      moderation: slice.moderation,
    }))

  /**
   * This should not happen because we should be filtering out notes without
   * videos within the `NoteFeed` component.
   */
  if (notes.length !== slices.length) return null

  return (
    <View style={[gutters]}>
      <View style={[a.flex_row, a.gap_sm]}>
        <Grid.Row gap={a.gap_sm.gap}>
          {notes.map(note => (
            <Grid.Col key={note.note.uri} width={1 / 2}>
              <VideoNoteCard
                note={note.note}
                sourceContext={sourceContext}
                moderation={note.moderation}
                onInteract={() => {
                  logEvent('videoCard:click', {context: 'feed'})
                }}
              />
            </Grid.Col>
          ))}
        </Grid.Row>
      </View>
    </View>
  )
}

export function NoteFeedVideoGridRowPlaceholder() {
  const gutters = useGutters(['base', 'base', 0, 'base'])
  return (
    <View style={[gutters]}>
      <View style={[a.flex_row, a.gap_sm]}>
        <VideoNoteCardPlaceholder />
        <VideoNoteCardPlaceholder />
      </View>
    </View>
  )
}
