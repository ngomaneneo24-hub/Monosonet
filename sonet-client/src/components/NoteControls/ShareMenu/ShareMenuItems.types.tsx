import {type PressableProps, type StyleProp, type ViewStyle} from 'react-native'
import {
  type SonetFeedDefs,
  type SonetFeedNote,
  type SonetFeedThreadgate,
  type RichText as RichTextAPI,
} from '@sonet/api'

import {type Shadow} from '#/state/cache/note-shadow'

export interface ShareMenuItemsProps {
  testID: string
  note: Shadow<SonetFeedDefs.NoteView>
  record: SonetFeedNote.Record
  richText: RichTextAPI
  style?: StyleProp<ViewStyle>
  hitSlop?: PressableProps['hitSlop']
  size?: 'lg' | 'md' | 'sm'
  timestamp: string
  threadgateRecord?: SonetFeedThreadgate.Record
  onShare: () => void
}
