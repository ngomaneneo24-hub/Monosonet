import React, {useCallback, useMemo, useState, useRef, useEffect} from 'react'
import {View, TouchableOpacity, ScrollView, Animated} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import AnimatedView, {
  LayoutAnimationConfig,
  LinearTransition,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutRight,
} from 'react-native-reanimated'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {ChevronRight_Stroke2_Corner0_Rounded as ChevronIcon} from '#/components/icons/Chevron'
import {Reply_Stroke2_Corner0_Rounded as ReplyIcon} from '#/components/icons/Reply'
import {SonetMessageItem} from './SonetMessageItem'
import {SonetMessageThreadInput} from './SonetMessageThreadInput'

// Thread message interface with enhanced metadata
interface ThreadMessage {
  id: string
  content: string
  senderId: string
  senderName?: string
  senderAvatar?: string
  timestamp: string
  isEncrypted?: boolean
  encryptionStatus?: 'encrypted' | 'decrypted' | 'failed'
  attachments?: Array<{
    id: string
    type: string
    url: string
    filename: string
  }>
  reactions?: Array<{
    emoji: string
    userId: string
  }>
  status?: string
  replyTo?: {
    id: string
    content: string
    senderName: string
  }
  threadId?: string
  threadDepth: number
  threadCount: number
  isThreadRoot: boolean
  lastThreadActivity?: string
  participants?: string[]
}

interface ThreadNode {
  message: ThreadMessage
  children: ThreadNode[]
  depth: number
  isExpanded: boolean
  hasUnreadReplies: boolean
}

interface SonetMessageThreadProps {
  rootMessage: ThreadMessage
  threadMessages: ThreadMessage[]
  onReply: (message: ThreadMessage) => void
  onEdit?: (message: ThreadMessage) => void
  onDelete?: (message: ThreadMessage) => void
  onPin?: (message: ThreadMessage) => void
  onThreadExpand?: (threadId: string, isExpanded: boolean) => void
  maxDepth?: number
  showThreadInput?: boolean
  onThreadInputSubmit?: (content: string, replyTo?: ThreadMessage) => Promise<void>
}

export function SonetMessageThread({
  rootMessage,
  threadMessages,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onThreadExpand,
  maxDepth = 3,
  showThreadInput = true,
  onThreadInputSubmit,
}: SonetMessageThreadProps) {
  const t = useTheme()
  const {_} = useLingui()
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set())
  const [threadInputVisible, setThreadInputVisible] = useState(false)
  const [replyingTo, setReplyingTo] = useState<ThreadMessage | null>(null)
  const scrollViewRef = useRef<ScrollView>(null)
  const threadInputRef = useRef<any>(null)

  // Build thread tree structure
  const threadTree = useMemo(() => {
    const buildTree = (messages: ThreadMessage[], depth = 0): ThreadNode[] => {
      const nodes: ThreadNode[] = []
      const messageMap = new Map<string, ThreadMessage>()
      
      // Create message map for quick lookup
      messages.forEach(msg => messageMap.set(msg.id, msg))
      
      // Build tree structure
      messages.forEach(message => {
        if (message.threadDepth === depth) {
          const node: ThreadNode = {
            message,
            children: buildTree(
              messages.filter(m => m.replyTo?.id === message.id),
              depth + 1
            ),
            depth,
            isExpanded: expandedThreads.has(message.id),
            hasUnreadReplies: false, // TODO: Implement unread tracking
          }
          nodes.push(node)
        }
      })
      
      return nodes
    }
    
    return buildTree(threadMessages)
  }, [threadMessages, expandedThreads])

  // Calculate thread statistics
  const threadStats = useMemo(() => {
    const totalMessages = threadMessages.length
    const uniqueParticipants = new Set(threadMessages.map(m => m.senderId)).size
    const lastActivity = threadMessages.length > 0 
      ? Math.max(...threadMessages.map(m => new Date(m.timestamp).getTime()))
      : new Date(rootMessage.timestamp).getTime()
    
    return {
      totalMessages,
      uniqueParticipants,
      lastActivity,
      hasUnreadReplies: false, // TODO: Implement unread tracking
    }
  }, [threadMessages, rootMessage])

  // Handle thread expansion
  const handleThreadToggle = useCallback((messageId: string) => {
    setExpandedThreads(prev => {
      const newSet = new Set(prev)
      if (newSet.has(messageId)) {
        newSet.delete(messageId)
      } else {
        newSet.add(messageId)
      }
      onThreadExpand?.(messageId, newSet.has(messageId))
      return newSet
    })
  }, [onThreadExpand])

  // Handle thread reply
  const handleThreadReply = useCallback((message: ThreadMessage) => {
    setReplyingTo(message)
    setThreadInputVisible(true)
    // Focus thread input after a short delay
    setTimeout(() => {
      threadInputRef.current?.focus()
    }, 100)
  }, [])

  // Handle thread input submit
  const handleThreadSubmit = useCallback(async (content: string) => {
    if (!onThreadInputSubmit) return
    
    try {
      await onThreadInputSubmit(content, replyingTo || undefined)
      setThreadInputVisible(false)
      setReplyingTo(null)
      // Scroll to bottom of thread
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({animated: true})
      }, 100)
    } catch (error) {
      console.error('Failed to submit thread message:', error)
    }
  }, [onThreadInputSubmit, replyingTo])

  // Render thread node recursively
  const renderThreadNode = useCallback((node: ThreadNode, level = 0) => {
    const {message, children, depth, isExpanded, hasUnreadReplies} = node
    const canExpand = children.length > 0 && depth < maxDepth
    const indentLevel = Math.min(level, maxDepth)
    
    return (
      <AnimatedView
        key={message.id}
        entering={FadeIn.springify().mass(0.3)}
        layout={LinearTransition.springify().mass(0.3)}
        style={[
          a.ml_md,
          a.border_l,
          a.pl_md,
          {
            borderLeftColor: t.atoms.border_contrast_25.color,
            borderLeftWidth: 2,
            marginLeft: indentLevel * 16,
          },
        ]}>
        
        {/* Thread Message */}
        <SonetMessageItem
          message={message}
          isOwnMessage={message.senderId === 'current_user'}
          onReply={handleThreadReply}
          onEdit={onEdit}
          onDelete={onDelete}
          onPin={onPin}
        />
        
        {/* Thread Expansion Controls */}
        {canExpand && (
          <View style={[a.flex_row, a.items_center, a.gap_sm, a.mt_sm, a.mb_xs]}>
            <TouchableOpacity
              onPress={() => handleThreadToggle(message.id)}
              style={[
                a.flex_row,
                a.items_center,
                a.gap_xs,
                a.px_sm,
                a.py_xs,
                a.rounded_full,
                t.atoms.bg_contrast_25,
              ]}>
              <ChevronIcon
                size="xs"
                style={[
                  t.atoms.text_contrast_medium,
                  {
                    transform: [{rotate: isExpanded ? '90deg' : '0deg'}],
                  },
                ]}
              />
              <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                {isExpanded ? _('Hide replies') : _('Show replies')} ({children.length})
              </Text>
              {hasUnreadReplies && (
                <View style={[
                  a.w_2,
                  a.h_2,
                  a.rounded_full,
                  t.atoms.bg_primary,
                ]} />
              )}
            </TouchableOpacity>
          </View>
        )}
        
        {/* Thread Children */}
        {canExpand && isExpanded && (
          <AnimatedView
            entering={SlideInRight.springify().mass(0.3)}
            exiting={SlideOutRight.springify().mass(0.3)}
            style={[a.mt_sm]}>
            {children.map(childNode => renderThreadNode(childNode, level + 1))}
          </AnimatedView>
        )}
      </AnimatedView>
    )
  }, [maxDepth, handleThreadToggle, handleThreadReply, onEdit, onDelete, onPin, t, _])

  // Layout animation configuration
  const layoutAnimation: LayoutAnimationConfig = {
    ...LinearTransition.springify().mass(0.3),
  }

  return (
    <View style={[a.flex_1]}>
      {/* Thread Header */}
      <View style={[
        a.px_md,
        a.py_sm,
        a.border_b,
        t.atoms.border_contrast_25,
        t.atoms.bg_contrast_25,
      ]}>
        <View style={[a.flex_row, a.items_center, a.justify_between]}>
          <View style={[a.flex_row, a.items_center, a.gap_sm]}>
            <ReplyIcon size="sm" style={[t.atoms.text_primary]} />
            <Text style={[a.text_sm, t.atoms.text_primary, a.font_bold]}>
              <Trans>Thread</Trans>
            </Text>
          </View>
          
          <View style={[a.flex_row, a.items_center, a.gap_md]}>
            <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
              {threadStats.totalMessages} messages
            </Text>
            <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
              {threadStats.uniqueParticipants} participants
            </Text>
            {threadStats.hasUnreadReplies && (
              <View style={[
                a.w_2,
                a.h_2,
                a.rounded_full,
                t.atoms.bg_primary,
              ]} />
            )}
          </View>
        </View>
        
        {/* Thread Summary */}
        <Text style={[a.text_xs, t.atoms.text_contrast_medium, a.mt_xs]}>
          {rootMessage.content.length > 100 
            ? rootMessage.content.substring(0, 100) + '...'
            : rootMessage.content
          }
        </Text>
      </View>

      {/* Thread Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={[a.flex_1]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[a.pb_md]}>
        
        {/* Root Message */}
        <View style={[a.px_md, a.pt_sm]}>
          <SonetMessageItem
            message={rootMessage}
            isOwnMessage={rootMessage.senderId === 'current_user'}
            onReply={handleThreadReply}
            onEdit={onEdit}
            onDelete={onDelete}
            onPin={onPin}
          />
        </View>

        {/* Thread Tree */}
        <View style={[a.mt_sm]}>
          {threadTree.map(node => renderThreadNode(node))}
        </View>
      </ScrollView>

      {/* Thread Input */}
      {showThreadInput && (
        <SonetMessageThreadInput
          ref={threadInputRef}
          isVisible={threadInputVisible}
          replyingTo={replyingTo}
          onSubmit={handleThreadSubmit}
          onCancel={() => {
            setThreadInputVisible(false)
            setReplyingTo(null)
          }}
          placeholder={_('Reply to thread...')}
        />
      )}
    </View>
  )
}

// Export types for use in other components
export type {ThreadMessage, ThreadNode}