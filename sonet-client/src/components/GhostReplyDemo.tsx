import React from 'react'
import {View, StyleSheet} from 'react-native'
import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/view/com/util/text/Text'
import {GhostReply} from './GhostReply'

type Props = {
  style?: any
}

export function GhostReplyDemo({style}: Props) {
  const t = useTheme()
  
  // Demo ghost replies to show how they would look
  const demoGhostReplies = [
    {
      content: "This is such a great point! I've been thinking about this for a while now.",
      ghostAvatar: '/assets/ghosts/ghost-1.jpg',
      ghostId: 'Ghost #7A3F',
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    },
    {
      content: "I completely disagree with the previous comment. This approach has been tried before and failed.",
      ghostAvatar: '/assets/ghosts/ghost-2.jpg',
      ghostId: 'Ghost #2B9E',
      timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
    },
    {
      content: "Can someone explain this in simpler terms? I'm trying to understand the concept.",
      ghostAvatar: '/assets/ghosts/ghost-3.jpg',
      ghostId: 'Ghost #F4C7',
      timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
    },
  ]
  
  return (
    <View style={[styles.container, style]}>
      <View style={[styles.header, {backgroundColor: t.palette.primary_50, borderColor: t.palette.primary_200}]}>
        <Text style={[a.text_lg, a.font_bold, {color: t.palette.primary_700}]}>
          👻 Ghost Reply Demo
        </Text>
        <Text style={[a.text_sm, {color: t.palette.primary_600}]}>
          Here's how ghost replies would look in a thread
        </Text>
      </View>
      
      {demoGhostReplies.map((reply, index) => (
        <GhostReply
          key={index}
          content={reply.content}
          ghostAvatar={reply.ghostAvatar}
          ghostId={reply.ghostId}
          timestamp={reply.timestamp}
          style={[styles.reply, index > 0 && {borderTopWidth: 1, borderTopColor: t.palette.border_contrast_low}]}
        />
      ))}
      
      <View style={[styles.footer, {backgroundColor: t.palette.background_secondary}]}>
        <Text style={[a.text_sm, {color: t.palette.text_contrast_low}]}>
          Ghost replies allow users to comment anonymously with unique avatars and ephemeral IDs
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  reply: {
    borderBottomWidth: 0,
  },
  footer: {
    padding: 12,
    alignItems: 'center',
  },
})