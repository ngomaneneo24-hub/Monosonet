import React from 'react'
import {View, StyleSheet} from 'react-native'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/view/com/util/text/Text'
import {GhostAvatar} from './GhostAvatar'
import {NoteMenuButton} from '#/components/NoteControls/NoteMenu'
import {type Shadow} from '#/state/cache/note-shadow'
import {type SonetFeedDefs} from '@sonet/api'

type Props = {
  content: string
  ghostAvatar: string
  ghostId: string
  timestamp: Date
  ghostReplyId: string // For menu actions
  threadId: string // For context
  style?: any
}

export function GhostReply({content, ghostAvatar, ghostId, timestamp, ghostReplyId, threadId, style}: Props) {
  const {_} = useLingui()
  const t = useTheme()
  
  const formatTimestamp = (date: Date) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return _(msg`now`)
    if (diffInMinutes < 60) return _(msg`${diffInMinutes}m`)
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return _(msg`${diffInHours}h`)
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return _(msg`${diffInDays}d`)
    
    return date.toLocaleDateString()
  }
  
  // Create a mock note structure for the menu system
  // This allows ghost replies to use the same menu as normal notes
  const mockNote: Shadow<SonetFeedDefs.NoteView> = {
    uri: `ghost-${ghostReplyId}`,
    cid: `ghost-${ghostReplyId}`,
    author: {
      did: `ghost-${ghostReplyId}`,
      handle: ghostId,
      displayName: ghostId,
      avatar: ghostAvatar,
      viewer: {
        blocked: false,
        muted: false,
        following: false,
        followedBy: false,
      },
      labels: [],
      indexedAt: timestamp.toISOString(),
    },
    record: {
      text: content,
      createdAt: timestamp.toISOString(),
      langs: ['en'],
    },
    embed: undefined,
    replyCount: 0,
    repostCount: 0,
    likeCount: 0,
    indexedAt: timestamp.toISOString(),
    labels: [],
    threadgate: undefined,
    viewer: {
      like: undefined,
      repost: undefined,
      reply: undefined,
      quote: undefined,
    },
  }
  
  return (
    <View style={[styles.container, style]}>
      {/* Ghost Avatar */}
      <View style={styles.avatarContainer}>
        <GhostAvatar avatarUrl={ghostAvatar} size={42} />
      </View>
      
      {/* Ghost Reply Content */}
      <View style={styles.contentContainer}>
        {/* Ghost Header */}
        <View style={styles.header}>
          <Text style={[a.text_sm, a.font_bold, {color: t.palette.primary_600}]}>
            {ghostId}
          </Text>
          <Text style={[a.text_xs, {color: t.palette.text_contrast_low}]}>
            {formatTimestamp(timestamp)}
          </Text>
        </View>
        
        {/* Ghost Reply Text */}
        <Text style={[a.text_sm, a.leading_snug, {color: t.palette.text_primary}]}>
          {content}
        </Text>
        
        {/* Ghost Mode Indicator */}
        <View style={[styles.ghostIndicator, {backgroundColor: t.palette.primary_50}]}>
          <Text style={[a.text_xs, {color: t.palette.primary_600}]}>
            👻 Ghost Reply
          </Text>
        </View>
      </View>
      
      {/* Note Menu Button - Same functionality as normal replies */}
      <View style={styles.menuContainer}>
        <NoteMenuButton
          testID={`ghostReplyMenu-${ghostReplyId}`}
          note={mockNote}
          noteFeedContext={threadId}
          noteReqId={ghostReplyId}
          record={mockNote.record}
          richText={{text: content, facets: []}}
          timestamp={timestamp.toISOString()}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  avatarContainer: {
    flexShrink: 0,
  },
  contentContainer: {
    flex: 1,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ghostIndicator: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  menuContainer: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
})