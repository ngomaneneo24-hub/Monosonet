// Engagement Tracker - Monitors user interactions for ML training
import React, {useEffect, useRef, useCallback} from 'react'
import {View, StyleSheet} from 'react-native'

interface EngagementTrackerProps {
  noteId: string
  onInteraction: (interaction: any) => void
  startTime: number
}

export function EngagementTracker({
  noteId,
  onInteraction,
  startTime
}: EngagementTrackerProps) {
  const viewStartTime = useRef(startTime)
  const isVisible = useRef(false)
  const hasInteracted = useRef(false)
  const interactionCount = useRef(0)

  // Track when note becomes visible
  const usernameViewStart = useCallback(() => {
    if (!isVisible.current) {
      isVisible.current = true
      viewStartTime.current = Date.now()
      
      // Send view interaction
      onInteraction({
        item: noteId,
        event: 'seen_start',
        feedContext: 'for-you',
        reqId: `view_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        metadata: {
          view_start_time: viewStartTime.current,
          interaction_count: interactionCount.current
        }
      })
    }
  }, [noteId, onInteraction])

  // Track when note becomes invisible
  const usernameViewEnd = useCallback(() => {
    if (isVisible.current) {
      isVisible.current = false
      const viewDuration = Date.now() - viewStartTime.current
      
      // Send view end interaction
      onInteraction({
        item: noteId,
        event: 'seen_end',
        feedContext: 'for-you',
        reqId: `view_end_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        metadata: {
          view_duration: viewDuration,
          interaction_count: interactionCount.current,
          has_interacted: hasInteracted.current
        }
      })
    }
  }, [noteId, onInteraction])

  // Track user interactions
  const trackInteraction = useCallback((interactionType: string) => {
    hasInteracted.current = true
    interactionCount.current += 1
    
    onInteraction({
      item: noteId,
      event: interactionType,
      feedContext: 'for-you',
      reqId: `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      metadata: {
        interaction_type: interactionType,
        interaction_count: interactionCount.current,
        time_since_view: Date.now() - viewStartTime.current,
        has_interacted: hasInteracted.current
      }
    })
  }, [noteId, onInteraction])

  // Track scroll behavior
  const trackScroll = useCallback((direction: 'up' | 'down') => {
    onInteraction({
      item: noteId,
      event: 'scroll',
      feedContext: 'for-you',
      reqId: `scroll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      metadata: {
        scroll_direction: direction,
        time_since_view: Date.now() - viewStartTime.current,
        interaction_count: interactionCount.current
      }
    })
  }, [noteId, onInteraction])

  // Track time-based engagement
  useEffect(() => {
    const intervals = [
      5000,   // 5 seconds
      15000,  // 15 seconds
      30000,  // 30 seconds
      60000   // 1 minute
    ]

    const timers = intervals.map(interval => 
      setTimeout(() => {
        if (isVisible.current) {
          onInteraction({
            item: noteId,
            event: 'dwell_threshold',
            feedContext: 'for-you',
            reqId: `time_${interval}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            metadata: {
              time_threshold: interval,
              time_since_view: Date.now() - viewStartTime.current,
              interaction_count: interactionCount.current,
              has_interacted: hasInteracted.current
            }
          })
        }
      }, interval)
    )

    return () => {
      timers.forEach(timer => clearTimeout(timer))
    }
  }, [noteId, onInteraction])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isVisible.current) {
        usernameViewEnd()
      }
    }
  }, [usernameViewEnd])

  // This component doesn't render anything visible
  // It just tracks engagement for ML training
  return null
}