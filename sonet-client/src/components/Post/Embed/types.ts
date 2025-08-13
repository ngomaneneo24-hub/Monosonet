import {type StyleProp, type ViewStyle} from 'react-native'
import {type SonetFeedDefs, type ModerationDecision} from '@sonet/api'

export enum NoteEmbedViewContext {
  ThreadHighlighted = 'ThreadHighlighted',
  Feed = 'Feed',
  FeedEmbedRecordWithMedia = 'FeedEmbedRecordWithMedia',
}

export enum QuoteEmbedViewContext {
  FeedEmbedRecordWithMedia = NoteEmbedViewContext.FeedEmbedRecordWithMedia,
}

export type CommonProps = {
  moderation?: ModerationDecision
  onOpen?: () => void
  style?: StyleProp<ViewStyle>
  viewContext?: NoteEmbedViewContext
  isWithinQuote?: boolean
  allowNestedQuotes?: boolean
}

export type EmbedProps = CommonProps & {
  embed?: SonetFeedDefs.NoteView['embed']
}
