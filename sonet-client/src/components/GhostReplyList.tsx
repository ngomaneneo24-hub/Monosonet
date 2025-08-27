import React from 'react'
import {View, StyleSheet, RefreshControl} from 'react-native'
import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/view/com/util/text/Text'
import {GhostReply} from './GhostReply'
import {useGhostReplies, type GhostReply as GhostReplyType} from '#/state/queries/ghost-replies'

type Props = {
  threadId: string
  style?: any
}

export function GhostReplyList({threadId, style}: Props) {
  const t = useTheme()
  const {data: ghostReplies, isLoading, error, refetch} = useGhostReplies(threadId)
  
  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, style]}>
        <Text style={[a.text_sm, {color: t.palette.text_contrast_low}]}>
          Loading ghost replies...
        </Text>
      </View>
    )
  }
  
  if (error) {
    return (
      <View style={[styles.container, styles.errorContainer, style]}>
        <Text style={[a.text_sm, {color: t.palette.negative_500}]}>
          Failed to load ghost replies
        </Text>
      </View>
    )
  }
  
  if (!ghostReplies || ghostReplies.length === 0) {
    return null // Don't show anything if no ghost replies
  }
  
  // Sort ghost replies by creation time (newest first)
  const sortedReplies = [...ghostReplies].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  
  return (
    <View style={[styles.container, style]}>
      {/* Ghost Replies Header */}
      <View style={[styles.header, {backgroundColor: t.palette.primary_50, borderColor: t.palette.primary_200}]}>
        <Text style={[a.text_sm, a.font_bold, {color: t.palette.primary_700}]}>
          👻 {ghostReplies.length} Ghost Reply{ghostReplies.length !== 1 ? 's' : ''}
        </Text>
        <Text style={[a.text_xs, {color: t.palette.primary_600}]}>
          Anonymous replies in this thread
        </Text>
      </View>
      
      {/* Ghost Replies List */}
      {sortedReplies.map((reply, index) => (
        <GhostReply
          key={reply.id}
          content={reply.content}
          ghostAvatar={reply.ghostAvatar}
          ghostId={reply.ghostId}
          timestamp={reply.createdAt}
          ghostReplyId={reply.id}
          threadId={threadId}
          style={[
            styles.reply,
            index > 0 && {borderTopWidth: 1, borderTopColor: t.palette.border_contrast_low}
          ]}
        />
      ))}
      
      {/* Refresh Control */}
      <RefreshControl
        refreshing={isLoading}
        onRefresh={refetch}
        colors={[t.palette.primary_500]}
        tintColor={t.palette.primary_500}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  header: {
    padding: 12,
    borderBottomWidth: 1,
    alignItems: 'center',
    gap: 2,
  },
  reply: {
    borderBottomWidth: 0,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
})