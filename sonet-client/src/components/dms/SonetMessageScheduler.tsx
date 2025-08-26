import React, {useCallback, useState, useMemo, useRef} from 'react'
import {View, TouchableOpacity, ScrollView, TextInput, Switch} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import AnimatedView, {
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideOutDown,
} from 'react-native-reanimated'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {Clock_Stroke2_Corner0_Rounded as ClockIcon} from '#/components/icons/Clock'
import {X_Stroke2_Corner0_Rounded as CloseIcon} from '#/components/icons/Times'
import {Calendar_Stroke2_Corner0_Rounded as CalendarIcon} from '#/components/icons/Calendar'
import {Repeat_Stroke2_Corner0_Rounded as RepeatIcon} from '#/components/icons/Repeat'
import {Check_Stroke2_Corner0_Rounded as CheckIcon} from '#/components/icons/Check'
import {Alert_Stroke2_Corner0_Rounded as AlertIcon} from '#/components/icons/Alert'

// Scheduling options
interface ScheduleOptions {
  date: Date
  time: Date
  timezone: string
  recurring: {
    enabled: boolean
    type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
    interval: number
    endDate?: Date
    endAfterOccurrences?: number
    daysOfWeek?: number[] // 0-6 (Sunday-Saturday)
    dayOfMonth?: number // 1-31
  }
  conditions: {
    onlyWhenOnline: boolean
    onlyDuringHours: boolean
    startHour: number
    endHour: number
    skipHolidays: boolean
  }
}

// Scheduled message interface
interface ScheduledMessage {
  id: string
  content: string
  attachments?: Array<{
    id: string
    type: string
    url: string
    filename: string
  }>
  scheduleOptions: ScheduleOptions
  status: 'pending' | 'sent' | 'cancelled' | 'failed'
  createdAt: string
  nextScheduledTime: string
  sentCount: number
  errorMessage?: string
}

interface SonetMessageSchedulerProps {
  isVisible: boolean
  onClose: () => void
  messageContent: string
  attachments?: Array<{
    id: string
    type: string
    url: string
    filename: string
  }>
  onSchedule: (scheduledMessage: Omit<ScheduledMessage, 'id' | 'status' | 'createdAt' | 'nextScheduledTime' | 'sentCount'>) => Promise<void>
}

export function SonetMessageScheduler({
  isVisible,
  onClose,
  messageContent,
  attachments,
  onSchedule,
}: SonetMessageSchedulerProps) {
  const t = useTheme()
  const {_} = useLingui()
  const [scheduleOptions, setScheduleOptions] = useState<ScheduleOptions>({
    date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    time: new Date(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    recurring: {
      enabled: false,
      type: 'daily',
      interval: 1,
      endDate: undefined,
      endAfterOccurrences: undefined,
      daysOfWeek: undefined,
      dayOfMonth: undefined,
    },
    conditions: {
      onlyWhenOnline: false,
      onlyDuringHours: false,
      startHour: 9,
      endHour: 17,
      skipHolidays: false,
    },
  })
  const [isScheduling, setIsScheduling] = useState(false)
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)

  // Get available timezones
  const timezones = useMemo(() => {
    return Intl.supportedValuesOf('timeZone').sort()
  }, [])

  // Calculate next scheduled time
  const nextScheduledTime = useMemo(() => {
    const baseTime = new Date(scheduleOptions.date)
    baseTime.setHours(scheduleOptions.time.getHours())
    baseTime.setMinutes(scheduleOptions.time.getMinutes())
    baseTime.setSeconds(0)
    baseTime.setMilliseconds(0)

    if (scheduleOptions.recurring.enabled) {
      // Calculate next occurrence based on recurring pattern
      const now = new Date()
      let nextTime = new Date(baseTime)

      while (nextTime <= now) {
        switch (scheduleOptions.recurring.type) {
          case 'daily':
            nextTime.setDate(nextTime.getDate() + scheduleOptions.recurring.interval)
            break
          case 'weekly':
            nextTime.setDate(nextTime.getDate() + (7 * scheduleOptions.recurring.interval))
            break
          case 'monthly':
            nextTime.setMonth(nextTime.getMonth() + scheduleOptions.recurring.interval)
            break
          case 'yearly':
            nextTime.setFullYear(nextTime.getFullYear() + scheduleOptions.recurring.interval)
            break
        }
      }

      return nextTime
    }

    return baseTime
  }, [scheduleOptions])

  // Handle date change
  const handleDateChange = useCallback((date: Date) => {
    setScheduleOptions(prev => ({
      ...prev,
      date,
    }))
  }, [])

  // Handle time change
  const handleTimeChange = useCallback((time: Date) => {
    setScheduleOptions(prev => ({
      ...prev,
      time,
    }))
  }, [])

  // Handle recurring toggle
  const handleRecurringToggle = useCallback((enabled: boolean) => {
    setScheduleOptions(prev => ({
      ...prev,
      recurring: {
        ...prev.recurring,
        enabled,
      },
    }))
  }, [])

  // Handle recurring type change
  const handleRecurringTypeChange = useCallback((type: ScheduleOptions['recurring']['type']) => {
    setScheduleOptions(prev => ({
      ...prev,
      recurring: {
        ...prev.recurring,
        type,
        // Reset specific options when type changes
        daysOfWeek: type === 'weekly' ? [1, 2, 3, 4, 5] : undefined, // Mon-Fri
        dayOfMonth: type === 'monthly' ? 1 : undefined,
      },
    }))
  }, [])

  // Handle schedule
  const handleSchedule = useCallback(async () => {
    if (nextScheduledTime <= new Date()) {
      // Show error for past time
      return
    }

    setIsScheduling(true)
    try {
      await onSchedule({
        content: messageContent,
        attachments,
        scheduleOptions,
      })
      onClose()
    } catch (error) {
      console.error('Failed to schedule message:', error)
    } finally {
      setIsScheduling(false)
    }
  }, [nextScheduledTime, messageContent, attachments, scheduleOptions, onSchedule, onClose])

  // Format time for display
  const formatTime = useCallback((date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }, [])

  // Format date for display
  const formatDate = useCallback((date: Date) => {
    return date.toLocaleDateString([], { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }, [])

  if (!isVisible) return null

  return (
    <AnimatedView
      entering={SlideInUp.springify().mass(0.3)}
      exiting={SlideOutDown.springify().mass(0.3)}
      style={[
        a.absolute,
        a.top_0,
        a.left_0,
        a.right_0,
        a.bottom_0,
        t.atoms.bg,
        a.z_50,
      ]}>
      
      {/* Scheduler Header */}
      <View style={[
        a.px_md,
        a.py_sm,
        a.border_b,
        t.atoms.border_contrast_25,
        t.atoms.bg,
      ]}>
        <View style={[a.flex_row, a.items_center, a.justify_between]}>
          <TouchableOpacity onPress={onClose}>
            <CloseIcon size="sm" style={[t.atoms.text_contrast_medium]} />
          </TouchableOpacity>
          
          <View style={[a.flex_row, a.items_center, a.gap_sm]}>
            <ClockIcon size="sm" style={[t.atoms.text_primary]} />
            <Text style={[a.text_sm, a.font_bold, t.atoms.text]}>
              <Trans>Schedule Message</Trans>
            </Text>
          </View>
          
          <TouchableOpacity
            onPress={() => setShowAdvancedOptions(!showAdvancedOptions)}>
            <Text style={[a.text_xs, t.atoms.text_primary]}>
              {showAdvancedOptions ? _('Basic') : _('Advanced')}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Message Preview */}
        <View style={[
          a.mt_sm,
          a.px_sm,
          a.py_xs,
          a.rounded_xl,
          t.atoms.bg_contrast_25,
        ]}>
          <Text style={[a.text_xs, t.atoms.text_contrast_medium, a.mb_xs]}>
            <Trans>Message Preview</Trans>
          </Text>
          <Text style={[a.text_sm, t.atoms.text]}>
            {messageContent.length > 100 
              ? messageContent.substring(0, 100) + '...'
              : messageContent
            }
          </Text>
          {attachments && attachments.length > 0 && (
            <Text style={[a.text_xs, t.atoms.text_contrast_medium, a.mt_xs]}>
              📎 {attachments.length} attachment{attachments.length !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
      </View>

      <ScrollView style={[a.flex_1]} showsVerticalScrollIndicator={false}>
        <View style={[a.p_md, a.gap_md]}>
          
          {/* Date & Time Selection */}
          <View style={[
            a.p_md,
            a.rounded_2xl,
            a.border,
            t.atoms.bg_contrast_25,
            t.atoms.border_contrast_25,
          ]}>
            <Text style={[a.text_sm, a.font_bold, t.atoms.text, a.mb_sm]}>
              <Trans>When to send</Trans>
            </Text>
            
            {/* Date Picker */}
            <View style={[a.flex_row, a.items_center, a.gap_sm, a.mb_sm]}>
              <CalendarIcon size="sm" style={[t.atoms.text_contrast_medium]} />
              <TouchableOpacity
                style={[
                  a.flex_1,
                  a.px_sm,
                  a.py_xs,
                  a.rounded_xl,
                  a.border,
                  t.atoms.bg,
                  t.atoms.border_contrast_25,
                ]}>
                <Text style={[a.text_sm, t.atoms.text]}>
                  {formatDate(scheduleOptions.date)}
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Time Picker */}
            <View style={[a.flex_row, a.items_center, a.gap_sm]}>
              <ClockIcon size="sm" style={[t.atoms.text_contrast_medium]} />
              <TouchableOpacity
                style={[
                  a.flex_1,
                  a.px_sm,
                  a.py_xs,
                  a.rounded_xl,
                  a.border,
                  t.atoms.bg,
                  t.atoms.border_contrast_25,
                ]}>
                <Text style={[a.text_sm, t.atoms.text]}>
                  {formatTime(scheduleOptions.time)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recurring Options */}
          <View style={[
            a.p_md,
            a.rounded_2xl,
            a.border,
            t.atoms.bg_contrast_25,
            t.atoms.border_contrast_25,
          ]}>
            <View style={[a.flex_row, a.items_center, a.justify_between, a.mb_sm]}>
              <View style={[a.flex_row, a.items_center, a.gap_sm]}>
                <RepeatIcon size="sm" style={[t.atoms.text_contrast_medium]} />
                <Text style={[a.text_sm, a.font_bold, t.atoms.text]}>
                  <Trans>Recurring</Trans>
                </Text>
              </View>
              
              <Switch
                value={scheduleOptions.recurring.enabled}
                onValueChange={handleRecurringToggle}
                trackColor={{
                  false: t.atoms.bg_contrast_25.color,
                  true: t.atoms.bg_primary_25.color,
                }}
                thumbColor={
                  scheduleOptions.recurring.enabled
                    ? t.atoms.bg_primary.color
                    : t.atoms.bg_contrast_medium.color
                }
              />
            </View>
            
            {scheduleOptions.recurring.enabled && (
              <AnimatedView
                entering={FadeIn.springify().mass(0.3)}
                style={[a.gap_sm]}>
                
                {/* Recurring Type */}
                <View style={[a.flex_row, a.gap_xs]}>
                  {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(type => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => handleRecurringTypeChange(type)}
                      style={[
                        a.flex_1,
                        a.px_sm,
                        a.py_xs,
                        a.rounded_sm,
                        a.border,
                        a.items_center,
                        scheduleOptions.recurring.type === type
                          ? [t.atoms.bg_primary, t.atoms.border_primary]
                          : [t.atoms.bg_contrast_25, t.atoms.border_contrast_25],
                      ]}>
                      <Text style={[
                        a.text_xs,
                        scheduleOptions.recurring.type === type
                          ? t.atoms.text_on_primary
                          : t.atoms.text_contrast_medium,
                      ]}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                {/* Interval */}
                <View style={[a.flex_row, a.items_center, a.gap_sm]}>
                  <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                    <Trans>Every</Trans>
                  </Text>
                  <TouchableOpacity
                    style={[
                      a.px_sm,
                      a.py_xs,
                      a.rounded_sm,
                      a.border,
                      t.atoms.bg,
                      t.atoms.border_contrast_25,
                    ]}>
                    <Text style={[a.text_sm, t.atoms.text]}>
                      {scheduleOptions.recurring.interval}
                    </Text>
                  </TouchableOpacity>
                  <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                    {scheduleOptions.recurring.type === 'daily' ? 'day(s)' :
                     scheduleOptions.recurring.type === 'weekly' ? 'week(s)' :
                     scheduleOptions.recurring.type === 'monthly' ? 'month(s)' : 'year(s)'}
                  </Text>
                </View>
              </AnimatedView>
            )}
          </View>

          {/* Advanced Options */}
          {showAdvancedOptions && (
            <AnimatedView
              entering={FadeIn.springify().mass(0.3)}
              style={[a.gap_md]}>
              
              {/* Timezone Selection */}
              <View style={[
                a.p_md,
                a.rounded_2xl,
                a.border,
                t.atoms.bg_contrast_25,
                t.atoms.border_contrast_25,
              ]}>
                <Text style={[a.text_sm, a.font_bold, t.atoms.text, a.mb_sm]}>
                  <Trans>Timezone</Trans>
                </Text>
                
                <TouchableOpacity
                  style={[
                    a.px_sm,
                    a.py_xs,
                    a.rounded_xl,
                    a.border,
                    t.atoms.bg,
                    t.atoms.border_contrast_25,
                  ]}>
                  <Text style={[a.text_sm, t.atoms.text]}>
                    {scheduleOptions.timezone}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Send Conditions */}
              <View style={[
                a.p_md,
                a.rounded_2xl,
                a.border,
                t.atoms.bg_contrast_25,
                t.atoms.border_contrast_25,
              ]}>
                <Text style={[a.text_sm, a.font_bold, t.atoms.text, a.mb_sm]}>
                  <Trans>Send Conditions</Trans>
                </Text>
                
                <View style={[a.gap_sm]}>
                  {/* Only when online */}
                  <View style={[a.flex_row, a.items_center, a.justify_between]}>
                    <Text style={[a.text_sm, t.atoms.text]}>
                      <Trans>Only when online</Trans>
                    </Text>
                    <Switch
                      value={scheduleOptions.conditions.onlyWhenOnline}
                      onValueChange={(value) => setScheduleOptions(prev => ({
                        ...prev,
                        conditions: { ...prev.conditions, onlyWhenOnline: value }
                      }))}
                      trackColor={{
                        false: t.atoms.bg_contrast_25.color,
                        true: t.atoms.bg_primary_25.color,
                      }}
                      thumbColor={
                        scheduleOptions.conditions.onlyWhenOnline
                          ? t.atoms.bg_primary.color
                          : t.atoms.bg_contrast_medium.color
                      }
                    />
                  </View>
                  
                  {/* Only during specific hours */}
                  <View style={[a.flex_row, a.items_center, a.justify_between]}>
                    <Text style={[a.text_sm, t.atoms.text]}>
                      <Trans>Only during business hours</Trans>
                    </Text>
                    <Switch
                      value={scheduleOptions.conditions.onlyDuringHours}
                      onValueChange={(value) => setScheduleOptions(prev => ({
                        ...prev,
                        conditions: { ...prev.conditions, onlyDuringHours: value }
                      }))}
                      trackColor={{
                        false: t.atoms.bg_contrast_25.color,
                        true: t.atoms.bg_primary_25.color,
                      }}
                      thumbColor={
                        scheduleOptions.conditions.onlyDuringHours
                          ? t.atoms.bg_primary.color
                          : t.atoms.bg_contrast_medium.color
                      }
                    />
                  </View>
                  
                  {/* Skip holidays */}
                  <View style={[a.flex_row, a.items_center, a.justify_between]}>
                    <Text style={[a.text_sm, t.atoms.text]}>
                      <Trans>Skip holidays</Trans>
                    </Text>
                    <Switch
                      value={scheduleOptions.conditions.skipHolidays}
                      onValueChange={(value) => setScheduleOptions(prev => ({
                        ...prev,
                        conditions: { ...prev.conditions, skipHolidays: value }
                      }))}
                      trackColor={{
                        false: t.atoms.bg_contrast_25.color,
                        true: t.atoms.bg_primary_25.color,
                      }}
                      thumbColor={
                        scheduleOptions.conditions.skipHolidays
                          ? t.atoms.bg_primary.color
                          : t.atoms.bg_contrast_medium.color
                      }
                    />
                  </View>
                </View>
              </View>
            </AnimatedView>
          )}
        </View>
      </ScrollView>

      {/* Schedule Summary & Button */}
      <View style={[
        a.px_md,
        a.py_sm,
        a.border_t,
        t.atoms.border_contrast_25,
        t.atoms.bg,
      ]}>
        
        {/* Schedule Summary */}
        <View style={[
          a.px_md,
          a.py_sm,
          a.rounded_2xl,
          a.border,
          t.atoms.bg_contrast_25,
          t.atoms.border_contrast_25,
          a.mb_sm,
        ]}>
          <Text style={[a.text_xs, a.font_bold, t.atoms.text, a.mb_xs]}>
            <Trans>Next scheduled time</Trans>
          </Text>
          <Text style={[a.text_sm, t.atoms.text_primary, a.font_bold]}>
            {formatDate(nextScheduledTime)} at {formatTime(nextScheduledTime)}
          </Text>
          {scheduleOptions.recurring.enabled && (
            <Text style={[a.text_xs, t.atoms.text_contrast_medium, a.mt_xs]}>
              <Trans>Recurring {scheduleOptions.recurring.type} message</Trans>
            </Text>
          )}
        </View>
        
        {/* Schedule Button */}
        <TouchableOpacity
          onPress={handleSchedule}
          disabled={isScheduling || nextScheduledTime <= new Date()}
          style={[
            a.w_full,
            a.py_sm,
            a.rounded_2xl,
            a.items_center,
            a.justify_center,
            (nextScheduledTime > new Date() && !isScheduling)
              ? t.atoms.bg_primary
              : t.atoms.bg_contrast_25,
          ]}>
          <Text style={[
            a.text_sm,
            a.font_bold,
            (nextScheduledTime > new Date() && !isScheduling)
              ? t.atoms.text_on_primary
              : t.atoms.text_contrast_medium,
          ]}>
            {isScheduling ? (
              <Trans>Scheduling...</Trans>
            ) : nextScheduledTime <= new Date() ? (
              <Trans>Please select a future time</Trans>
            ) : (
              <Trans>Schedule Message</Trans>
            )}
          </Text>
        </TouchableOpacity>
      </View>
    </AnimatedView>
  )
}

// Export types for use in other components
export type {ScheduleOptions, ScheduledMessage}