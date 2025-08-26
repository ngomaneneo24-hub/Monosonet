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
import {Warning_Stroke2_Corner0_Rounded as WarningIcon} from '#/components/icons/Warning'
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
  renderKey: string // For React key optimization
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
  maxVisibleDepth?: number
  showThreadInput?: boolean
  onThreadInputSubmit?: (content: string, replyTo?: ThreadMessage) => Promise<void>
  performanceMode?: boolean
}

// Performance monitoring and limits
const THREAD_PERFORMANCE_LIMITS = {
  MAX_DEPTH: 10, // Maximum thread depth allowed
  MAX_VISIBLE_DEPTH: 5, // Maximum depth rendered at once
  MAX_CHILDREN_PER_NODE: 50, // Maximum children per thread node
  MAX_TOTAL_MESSAGES: 1000, // Maximum total messages in thread
  RENDER_TIMEOUT_MS: 100, // Maximum render time per frame
}

export function SonetMessageThread({
  rootMessage,
  threadMessages,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onThreadExpand,
  maxDepth = THREAD_PERFORMANCE_LIMITS.MAX_DEPTH,
  maxVisibleDepth = THREAD_PERFORMANCE_LIMITS.MAX_VISIBLE_DEPTH,
  showThreadInput = true,
  onThreadInputSubmit,
  performanceMode = false,
}: SonetMessageThreadProps) {
  const t = useTheme()
  const {_} = useLingui()
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set())
  const [threadInputVisible, setThreadInputVisible] = useState(false)
  const [replyingTo, setReplyingTo] = useState<ThreadMessage | null>(null)
  const [performanceWarning, setPerformanceWarning] = useState<string | null>(null)
  const [renderStartTime, setRenderStartTime] = useState<number>(0)
  const scrollViewRef = useRef<ScrollView>(null)
  const threadInputRef = useRef<any>(null)
  const performanceMonitorRef = useRef<NodeJS.Timeout>()

  // Performance monitoring
  useEffect(() => {
    setRenderStartTime(performance.now())
    
    // Set render timeout
    performanceMonitorRef.current = setTimeout(() => {
      const renderTime = performance.now() - renderStartTime
      if (renderTime > THREAD_PERFORMANCE_LIMITS.RENDER_TIMEOUT_MS) {
        setPerformanceWarning(`Thread rendering took ${Math.round(renderTime)}ms - consider reducing depth`)
      }
    }, THREAD_PERFORMANCE_LIMITS.RENDER_TIMEOUT_MS)

    return () => {
      if (performanceMonitorRef.current) {
        clearTimeout(performanceMonitorRef.current)
      }
    }
  }, [threadMessages, expandedThreads])

  // Validate thread depth and performance
  const threadValidation = useMemo(() => {
    const maxActualDepth = Math.max(...threadMessages.map(m => m.threadDepth || 0))
    const totalMessages = threadMessages.length
    const hasPerformanceIssues = maxActualDepth > maxDepth || totalMessages > THREAD_PERFORMANCE_LIMITS.MAX_TOTAL_MESSAGES
    
    return {
      maxActualDepth,
      totalMessages,
      hasPerformanceIssues,
      warnings: [] as string[],
    }
  }, [threadMessages, maxDepth])

  // Generate warnings
  useEffect(() => {
    const warnings: string[] = []
    
    if (threadValidation.maxActualDepth > maxDepth) {
      warnings.push(`Thread depth ${threadValidation.maxActualDepth} exceeds limit ${maxDepth}`)
    }
    
    if (threadValidation.totalMessages > THREAD_PERFORMANCE_LIMITS.MAX_TOTAL_MESSAGES) {
      warnings.push(`Thread has ${threadValidation.totalMessages} messages - performance may degrade`)
    }
    
    if (warnings.length > 0) {
      setPerformanceWarning(warnings.join('; '))
    } else {
      setPerformanceWarning(null)
    }
  }, [threadValidation, maxDepth])

  // Build thread tree structure with performance optimizations
  const threadTree = useMemo(() => {
    const buildTree = (messages: ThreadMessage[], depth = 0): ThreadNode[] => {
      // Performance guard: limit recursion depth
      if (depth > maxDepth) {
        console.warn(`Thread depth ${depth} exceeded limit ${maxDepth}`)
        return []
      }

      const nodes: ThreadNode[] = []
      const messageMap = new Map<string, ThreadMessage>()
      
      // Create message map for quick lookup
      messages.forEach(msg => messageMap.set(msg.id, msg))
      
      // Build tree structure with performance limits
      messages.forEach(message => {
        if (message.threadDepth === depth) {
          const children = buildTree(
            messages.filter(m => m.replyTo?.id === message.id),
            depth + 1
          )
          
          // Limit children per node for performance
          const limitedChildren = children.slice(0, THREAD_PERFORMANCE_LIMITS.MAX_CHILDREN_PER_NODE)
          
          const node: ThreadNode = {
            message,
            children: limitedChildren,
            depth,
            isExpanded: expandedThreads.has(message.id),
            hasUnreadReplies: false, // TODO: Implement unread tracking
            renderKey: `${message.id}-${depth}-${children.length}`, // Optimized React key
          }
          nodes.push(node)
        }
      })
      
      return nodes
    }
    
    return buildTree(threadMessages)
  }, [threadMessages, expandedThreads, maxDepth])

  // Calculate thread statistics with performance monitoring
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
      performanceMetrics: {
        maxDepth: threadValidation.maxActualDepth,
        hasPerformanceIssues: threadValidation.hasPerformanceIssues,
        estimatedRenderTime: totalMessages * 0.1, // Rough estimate: 0.1ms per message
      },
    }
  }, [threadMessages, rootMessage, threadValidation])

  // Handle thread expansion with performance checks
  const handleThreadToggle = useCallback((messageId: string) => {
    // Performance check: prevent expanding if too many messages would be rendered
    const node = findNodeById(threadTree, messageId)
    if (node && getTotalDescendantCount(node) > THREAD_PERFORMANCE_LIMITS.MAX_TOTAL_MESSAGES / 2) {
      setPerformanceWarning('Expanding this thread may cause performance issues')
      return
    }

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
  }, [threadTree, onThreadExpand])

  // Helper function to find node by ID
  const findNodeById = useCallback((nodes: ThreadNode[], id: string): ThreadNode | null => {
    for (const node of nodes) {
      if (node.message.id === id) return node
      const found = findNodeById(node.children, id)
      if (found) return found
    }
    return null
  }, [])

  // Helper function to count total descendants
  const getTotalDescendantCount = useCallback((node: ThreadNode): number => {
    let count = 1
    for (const child of node.children) {
      count += getTotalDescendantCount(child)
    }
    return count
  }, [])

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

  // Render thread node recursively with performance optimizations
  const renderThreadNode = useCallback((node: ThreadNode, level = 0) => {
    const {message, children, depth, isExpanded, hasUnreadReplies} = node
    const canExpand = children.length > 0 && depth < maxDepth
    const indentLevel = Math.min(level, maxVisibleDepth)
    
    // Performance guard: don't render beyond visible depth
    if (level > maxVisibleDepth) {
      return (
        <View key={`depth-limit-${message.id}`} style={[a.px_md, a.py_sm]}>
          <Text style={[a.text_xs, t.atoms.text_warning]}>
            <Trans>Thread depth limit reached ({maxVisibleDepth} levels)</Trans>
          </Text>
        </View>
      )
    }
    
    return (
      <AnimatedView
        key={node.renderKey}
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
                {children.length > THREAD_PERFORMANCE_LIMITS.MAX_CHILDREN_PER_NODE && (
                  <Text style={[t.atoms.text_warning]}>
                    {' '}(+{children.length - THREAD_PERFORMANCE_LIMITS.MAX_CHILDREN_PER_NODE} more)
                  </Text>
                )}
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
        
        {/* Thread Children with Performance Guard */}
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
  }, [maxDepth, maxVisibleDepth, handleThreadToggle, handleThreadReply, onEdit, onDelete, onPin, t, _])

  // Layout animation configuration
  const layoutAnimation: LayoutAnimationConfig = {
    ...LinearTransition.springify().mass(0.3),
  }

  return (
    <View style={[a.flex_1]}>
      {/* Performance Warning Banner */}
      {performanceWarning && (
        <View style={[
          a.mx_md,
          a.mt_sm,
          a.px_md,
          a.py_sm,
          a.rounded_2xl,
          a.border,
          t.atoms.bg_warning_25,
          t.atoms.border_warning,
          a.flex_row,
          a.items_center,
          a.gap_sm,
        ]}>
          <WarningIcon size="sm" style={[t.atoms.text_warning]} />
          <Text style={[a.text_xs, t.atoms.text_warning, a.flex_1]}>
            {performanceWarning}
          </Text>
          <TouchableOpacity onPress={() => setPerformanceWarning(null)}>
            <Text style={[a.text_xs, t.atoms.text_warning, a.font_bold]}>
              ×
            </Text>
          </TouchableOpacity>
        </View>
      )}

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
        
        {/* Performance Metrics */}
        {performanceMode && (
          <View style={[a.flex_row, a.items_center, a.gap_sm, a.mt_xs]}>
            <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
              Depth: {threadStats.performanceMetrics.maxDepth}/{maxDepth}
            </Text>
            <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
              Est. render: {Math.round(threadStats.performanceMetrics.estimatedRenderTime)}ms
            </Text>
            {threadStats.performanceMetrics.hasPerformanceIssues && (
              <Text style={[a.text_xs, t.atoms.text_warning]}>
                ⚠️ Performance issues detected
              </Text>
            )}
          </View>
        )}
        
        {/* Thread Summary */}
        <Text style={[a.text_xs, t.atoms.text_contrast_medium, a.mt_xs]}>
          {rootMessage.content.length > 100 
            ? rootMessage.content.substring(0, 100) + '...'
            : rootMessage.content
          }
        </Text>
      </View>

      {/* Thread Messages with Virtual Scrolling */}
      <ScrollView
        ref={scrollViewRef}
        style={[a.flex_1]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[a.pb_md]}
        removeClippedSubviews={true} // Performance optimization
        maxToRenderPerBatch={10} // Limit batch rendering
        windowSize={10} // Reduce memory usage
        >
        
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

        {/* Thread Tree with Performance Monitoring */}
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
export {THREAD_PERFORMANCE_LIMITS}