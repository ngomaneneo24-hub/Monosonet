import {memo, useMemo, useState} from 'react'
import {
  type SonetFeedDefs,
  type SonetFeedNote,
  type SonetFeedThreadgate,
  type RichText as RichTextAPI,
} from '@sonet/api'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import type React from 'react'

import {type Shadow} from '#/state/cache/note-shadow'
import {EventStopper} from '#/view/com/util/EventStopper'
import {DotGrid_Stroke2_Corner0_Rounded as DotsHorizontal} from '#/components/icons/DotGrid'
import {useMenuControl} from '#/components/Menu'
import * as Menu from '#/components/Menu'
import {NoteControlButton, NoteControlButtonIcon} from '../NoteControlButton'
import {NoteMenuItems} from './NoteMenuItems'

let NoteMenuButton = ({
  testID,
  note,
  noteFeedContext,
  noteReqId,
  big,
  record,
  richText,
  timestamp,
  threadgateRecord,
  onShowLess,
}: {
  testID: string
  note: Shadow<SonetFeedDefs.NoteView>
  noteFeedContext: string | undefined
  noteReqId: string | undefined
  big?: boolean
  record: SonetFeedNote.Record
  richText: RichTextAPI
  timestamp: string
  threadgateRecord?: SonetFeedThreadgate.Record
  onShowLess?: (interaction: SonetFeedDefs.Interaction) => void
}): React.ReactNode => {
  const {_} = useLingui()

  const menuControl = useMenuControl()
  const [hasBeenOpen, setHasBeenOpen] = useState(false)
  const lazyMenuControl = useMemo(
    () => ({
      ...menuControl,
      open() {
        setHasBeenOpen(true)
        // HACK. We need the state update to be flushed by the time
        // menuControl.open() fires but RN doesn't expose flushSync.
        setTimeout(menuControl.open)
      },
    }),
    [menuControl, setHasBeenOpen],
  )
  return (
    <EventStopper onKeyDown={false}>
      <Menu.Root control={lazyMenuControl}>
        <Menu.Trigger label={_(msg`Open note options menu`)}>
          {({props}) => {
            return (
              <NoteControlButton
                testID="noteDropdownBtn"
                big={big}
                label={props.accessibilityLabel}
                {...props}>
                <NoteControlButtonIcon icon={DotsHorizontal} />
              </NoteControlButton>
            )
          }}
        </Menu.Trigger>
        {hasBeenOpen && (
          // Lazily initialized. Once mounted, they stay mounted.
          <NoteMenuItems
            testID={testID}
            note={note}
            noteFeedContext={noteFeedContext}
            noteReqId={noteReqId}
            record={record}
            richText={richText}
            timestamp={timestamp}
            threadgateRecord={threadgateRecord}
            onShowLess={onShowLess}
          />
        )}
      </Menu.Root>
    </EventStopper>
  )
}

NoteMenuButton = memo(NoteMenuButton)
export {NoteMenuButton}
