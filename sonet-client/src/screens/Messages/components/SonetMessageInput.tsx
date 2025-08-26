import React, {useCallback, useState} from 'react'
import {View, TextInput, TouchableOpacity, Platform, PanResponder, GestureResponderEvent, PanResponderGestureState} from 'react-native'
import { Audio } from 'expo-av'
import * as Haptics from 'expo-haptics'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {Button} from '#/components/Button'
import {sonetWebSocket} from '#/services/sonetWebSocket'
import {sonetMessagingApi} from '#/services/sonetMessagingApi'
import {Trans} from '@lingui/react'
import {ButtonText} from '#/components/ButtonText'

interface SonetMessageInputProps {
  onSendMessage: (text: string, attachments?: File[]) => Promise<void>
  placeholder?: string
  disabled?: boolean
  isEncrypted?: boolean
  encryptionStatus?: 'enabled' | 'disabled' | 'pending'
}

export function SonetMessageInput({
  onSendMessage,
  placeholder,
  disabled = false,
  isEncrypted = false,
  encryptionStatus = 'disabled',
}: SonetMessageInputProps) {
  const t = useTheme()
  const {_} = useLingui()
  const [text, setText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [attachments, setAttachments] = useState<Array<{file: File | { uri: string; name: string; type: string }, progress: number, status: 'queued' | 'uploading' | 'uploaded' | 'failed', cancel?: { cancelled: boolean }}>>([])
  const [isRecording, setIsRecording] = useState(false)
  const [recordingStart, setRecordingStart] = useState<number | null>(null)
  const [recordingMs, setRecordingMs] = useState(0)
  const recordingTimerRef = React.useRef<number | null>(null)
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null)
  const recordedChunksRef = React.useRef<BlobPart[]>([])
  const nativeRecordingRef = React.useRef<Audio.Recording | null>(null)
  const [isHoldRecording, setIsHoldRecording] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [waveform, setWaveform] = useState<number[]>([])
  const waveformTimerRef = React.useRef<number | null>(null)

  const startTimer = useCallback(() => {
    if (recordingTimerRef.current) cancelAnimationFrame(recordingTimerRef.current)
    const tick = () => {
      if (recordingStart) {
        setRecordingMs(Date.now() - recordingStart)
        recordingTimerRef.current = requestAnimationFrame(tick)
      }
    }
    recordingTimerRef.current = requestAnimationFrame(tick)
  }, [recordingStart])

  const stopTimer = useCallback(() => {
    if (recordingTimerRef.current) cancelAnimationFrame(recordingTimerRef.current)
    recordingTimerRef.current = null
  }, [])

  const stopWaveform = () => {
    if (waveformTimerRef.current) cancelAnimationFrame(waveformTimerRef.current)
    waveformTimerRef.current = null
    setWaveform([])
  }
  const startWaveform = () => {
    if (waveformTimerRef.current) cancelAnimationFrame(waveformTimerRef.current)
    const tick = async () => {
      let amp = Math.min(1, Math.max(0.05, Math.random()))
      try {
        if (Platform.OS !== 'web' && nativeRecordingRef.current) {
          const status: any = await nativeRecordingRef.current.getStatusAsync()
          // Some platforms expose metering; map [-160..0] dBFS -> [0..1]
          const db = status.metering || status.averagePower || undefined
          if (typeof db === 'number') {
            const norm = Math.max(0, Math.min(1, 1 + db / 60))
            amp = norm
          }
        }
      } catch {}
      setWaveform(prev => {
        const next = [...prev, amp]
        return next.slice(-24)
      })
      // Basic VAD auto-stop: if low amplitude for ~2s, stop (only when not locked)
      if (!isLocked && isRecording) {
        const low = waveform.filter(v => v < 0.12).length
        if (low > 20) {
          try {
            await toggleRecord()
          } catch {}
        }
      }
      waveformTimerRef.current = requestAnimationFrame(tick)
    }
    waveformTimerRef.current = requestAnimationFrame(tick)
  }

  const toggleRecord = useCallback(async () => {
    if (isRecording) {
      // Stop
      try {
        if (Platform.OS === 'web') {
          mediaRecorderRef.current?.stop()
        } else {
          const rec = nativeRecordingRef.current
          if (rec) {
            await rec.stopAndUnloadAsync()
            const uri = rec.getURI()
            if (uri) {
              const fileLike = { uri, name: `voice_${Date.now()}.m4a`, type: 'audio/m4a' }
              setAttachments(prev => [...prev, { file: fileLike, progress: 0, status: 'queued' }])
            }
          }
        }
      } catch {}
      setIsRecording(false)
      setRecordingStart(null)
      stopTimer()
      stopWaveform()
    } else {
      // Start
      try {
        if (Platform.OS === 'web') {
          // Web
          const stream = await navigator.mediaDevices.getUserMedia({audio: true})
          recordedChunksRef.current = []
          const mr = new MediaRecorder(stream)
          mediaRecorderRef.current = mr
          mr.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data)
          }
          mr.onstop = () => {
            try {
              const blob = new Blob(recordedChunksRef.current, {type: 'audio/webm'})
              const file = new File([blob], `voice_${Date.now()}.webm`, {type: 'audio/webm'})
              setAttachments(prev => [...prev, { file, progress: 0, status: 'queued' }])
              stream.getTracks().forEach(t => t.stop())
            } catch {}
          }
          mr.start()
        } else {
          // Native
          await Audio.requestPermissionsAsync()
          await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true })
          const recording = new Audio.Recording()
          await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY)
          nativeRecordingRef.current = recording
          await recording.startAsync()
        }
        setIsRecording(true)
        const now = Date.now()
        setRecordingStart(now)
        setRecordingMs(0)
        startTimer()
        startWaveform()
      } catch (err) {
        console.error('Failed to start recording:', err)
      }
    }
  }, [isRecording, startTimer, stopTimer])

  const addAttachment = useCallback(async () => {
    // Basic web-only file input; native should use image picker bridging
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.onchange = () => {
      const files = Array.from(input.files || []) as File[]
      if (files.length) {
        setAttachments(prev => [...prev, ...files.map(f => ({ file: f, progress: 0, status: 'queued' }))])
      }
    }
    input.click()
  }, [])

  const removeAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }, [])

  const usernameSend = useCallback(async () => {
    if ((!text.trim() && attachments.length === 0) || isSending || disabled) return

    setIsSending(true)
    try {
      // Upload attachments with per-file progress and cancellation
      const uploadedFiles: File[] = []
      for (let i = 0; i < attachments.length; i++) {
        const att = attachments[i]
        const cancelRef = { cancelled: false }
        setAttachments(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'uploading', cancel: cancelRef } : it))
        try {
          await sonetMessagingApi.uploadAttachment(
            att.file as any,
            (undefined as any),
            true,
            pct => {
              setAttachments(prev => prev.map((it, idx) => idx === i ? { ...it, progress: pct } : it))
            },
            cancelRef,
          )
          setAttachments(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'uploaded', progress: 100 } : it))
          // For onSendMessage signature, we pass original File objects when available
          if (att.file instanceof File) uploadedFiles.push(att.file)
        } catch (e) {
          setAttachments(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'failed' } : it))
          throw e
        }
      }
      await onSendMessage(text.trim(), uploadedFiles)
      setText('')
      setAttachments([])
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }, [text, attachments, isSending, disabled, onSendMessage])

  const usernameKeyPress = useCallback((e: any) => {
    if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
      e.preventDefault()
      usernameSend()
    }
  }, [usernameSend])

  // Typing indicator (web only)
  const typingTimeoutRef = React.useRef<number | null>(null)
  const sendTyping = useCallback(() => {
    try {
      // @ts-ignore navigator may not exist in native
      sonetWebSocket.sendTyping?.(undefined as any, true)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {
        // @ts-ignore
        sonetWebSocket.sendTyping?.(undefined as any, false)
      }, 1500) as unknown as number
    } catch {}
  }, [])

  const getEncryptionIcon = () => {
    switch (encryptionStatus) {
      case 'enabled':
        return '🔒'
      case 'disabled':
        return '🔓'
      case 'pending':
        return '⏳'
      default:
        return '🔓'
    }
  }

  const getEncryptionColor = () => {
    switch (encryptionStatus) {
      case 'enabled':
        return t.atoms.text_positive
      case 'disabled':
        return t.atoms.text_contrast_medium
      case 'pending':
        return t.atoms.text_warning
      default:
        return t.atoms.text_contrast_medium
    }
  }

  const panResponder = React.useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: async () => {
      setPanX(0); setPanY(0)
      setIsHoldRecording(true)
      setIsLocked(false)
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(()=>{})
      if (!isRecording) await toggleRecord()
    },
    onPanResponderMove: (_evt: GestureResponderEvent, gesture: PanResponderGestureState) => {
      setPanX(gesture.dx)
      setPanY(gesture.dy)
      if (gesture.dy < -60) {
        if (!isLocked && Platform.OS !== 'web') Haptics.selectionAsync().catch(()=>{})
        setIsLocked(true)
      }
    },
    onPanResponderRelease: async () => {
      if (isLocked) {
        // keep recording until user taps stop
        setIsHoldRecording(false)
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(()=>{})
        return
      }
      // slide left cancel
      if (panX < -60) {
        // cancel and discard
        try {
          if (Platform.OS === 'web') {
            mediaRecorderRef.current?.stop()
          } else {
            const rec = nativeRecordingRef.current
            if (rec) {
              await rec.stopAndUnloadAsync()
            }
          }
        } catch {}
        setIsRecording(false)
        setRecordingStart(null)
        stopTimer()
        stopWaveform()
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(()=>{})
      } else {
        // finish and save
        await toggleRecord()
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(()=>{})
      }
      setIsHoldRecording(false)
      setIsLocked(false)
      setPanX(0); setPanY(0)
    },
  }), [isRecording, panX, toggleRecord])

  return (
    <View style={[a.flex_row, a.items_end, a.gap_sm, a.px_md, a.py_sm]}>
      {/* Encryption Status */}
      <TouchableOpacity
        style={[
          a.w_8,
          a.h_8,
          a.rounded_full,
          a.items_center,
          a.justify_center,
          t.atoms.bg_contrast_25,
        ]}
        disabled={true}>
        <Text
          style={[
            a.text_sm,
            {
              color: getEncryptionColor(),
            },
          ]}>
          {getEncryptionIcon()}
        </Text>
      </TouchableOpacity>

      {/* Media Picker */}
      <Button
        onPress={addAttachment}
        style={[a.w_10, a.h_10, a.rounded_full, a.items_center, a.justify_center, t.atoms.bg_contrast_25]}>
        <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>＋</Text>
      </Button>

      {/* Voice Recorder (hold to record) */}
      <View
        {...panResponder.panHandlers}
        style={[a.w_10, a.h_10, a.rounded_full, a.items_center, a.justify_center, isRecording ? t.atoms.bg_warning : t.atoms.bg_contrast_25]}>
        <Text style={[a.text_sm, isRecording ? t.atoms.text : t.atoms.text_contrast_medium]}>
          {isRecording ? (isLocked ? '🔒' : '◼') : '🎤'}
        </Text>
      </View>

      {/* Text Input */}
      <View style={[a.flex_1, a.relative]}>
        <TextInput
          value={text}
          onChangeText={(v) => { setText(v); sendTyping() }}
          onKeyPress={usernameKeyPress}
          placeholder={placeholder || _('Type a message...')}
          placeholderTextColor={t.atoms.text_contrast_medium}
          multiline
          maxLength={1000}
          editable={!disabled}
          style={[
            a.text_sm,
            a.px_md,
            a.py_sm,
            a.rounded_2xl,
            a.border,
            a.min_h_10,
            a.max_h_32,
            t.atoms.bg,
            t.atoms.text,
            t.atoms.border_contrast_25,
            {
              textAlignVertical: 'center',
            },
          ]}
        />
        
        {/* Attachments Preview (compact) */}
        {attachments.length > 0 && (
          <View style={[a.mt_2, a.flex_row, a.gap_2, a.flex_wrap]}>
            {attachments.map((att, idx) => (
              <View key={idx} style={[a.flex_row, a.items_center, a.gap_2, a.px_2, a.py_1, a.rounded_full, t.atoms.bg_contrast_25]}>
                <Text style={[a.text_xs, t.atoms.text]} numberOfLines={1}>
                  {(att.file as any).name || 'file'}
                </Text>
                <View style={[{ width: 64, height: 4 }, a.rounded_full, t.atoms.bg_contrast_200]}>
                  <View style={[{ width: `${att.progress}%`, height: 4 }, a.rounded_full, t.atoms.bg_primary]} />
                </View>
                {att.status === 'uploading' && (
                  <TouchableOpacity onPress={() => {
                    if (att.cancel) att.cancel.cancelled = true
                  }}>
                    <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>Cancel</Text>
                  </TouchableOpacity>
                )}
                {att.status === 'failed' && (
                  <TouchableOpacity onPress={async () => {
                    // retry single upload
                    const cancelRef = { cancelled: false }
                    setAttachments(prev => prev.map((it, i2) => i2 === idx ? { ...it, status: 'uploading', cancel: cancelRef, progress: 0 } : it))
                    try {
                      await sonetMessagingApi.uploadAttachment(
                        att.file as any,
                        (undefined as any),
                        true,
                        pct => setAttachments(prev => prev.map((it, i2) => i2 === idx ? { ...it, progress: pct } : it)),
                        cancelRef,
                      )
                      setAttachments(prev => prev.map((it, i2) => i2 === idx ? { ...it, status: 'uploaded', progress: 100 } : it))
                    } catch (e) {
                      setAttachments(prev => prev.map((it, i2) => i2 === idx ? { ...it, status: 'failed' } : it))
                    }
                  }}>
                    <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>Retry</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => removeAttachment(idx)}>
                  <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Recording timer */}
        {isRecording && (
          <View style={[a.mt_2, a.flex_row, a.items_center, a.gap_2]}>
            <Text style={[a.text_xs, t.atoms.text_warning]}>
              {Math.floor(recordingMs / 1000)}s
            </Text>
            {/* Waveform */}
            <View style={[a.flex_row, a.gap_1]}>
              {waveform.map((amp, i) => (
                <View key={i} style={[{ width: 3, height: Math.max(4, Math.round(amp * 24)) }, a.rounded_full, t.atoms.bg_warning]} />
              ))}
            </View>
            {/* Hints */}
            {!isLocked && isHoldRecording && (
              <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>Slide left to cancel · Slide up to lock</Text>
            )}
          </View>
        )}
        
        {/* Character count */}
        <View style={[a.absolute, a.bottom_1, a.right_2]}>
          <Text
            style={[
              a.text_xs,
              t.atoms.text_contrast_medium,
            ]}>
            {text.length}/1000
          </Text>
        </View>
      </View>

      {/* Send Button */}
      <Button
        onPress={usernameSend}
        disabled={(!text.trim() && attachments.length === 0) || isSending || disabled}
        style={[
          a.w_10,
          a.h_10,
          a.rounded_full,
          a.items_center,
          a.justify_center,
          (!text.trim() && attachments.length === 0) || isSending || disabled
            ? t.atoms.bg_contrast_25
            : t.atoms.bg_primary,
        ]}>
        <Text
          style={[
            a.text_sm,
            (!text.trim() && attachments.length === 0) || isSending || disabled
              ? t.atoms.text_contrast_medium
              : t.atoms.text_on_primary,
          ]}>
          {isSending ? '⏳' : '➤'}
        </Text>
      </Button>
    </View>
  )
}

// Quick reply component
export function SonetQuickReply({
  options,
  onSelect,
}: {
  options: string[]
  onSelect: (option: string) => void
}) {
  const t = useTheme()
  
  return (
    <View style={[a.flex_row, a.flex_wrap, a.gap_sm, a.p_4]}>
      {options.map((option, index) => (
        <Button
          key={index}
          size="small"
          variant="outline"
          color="secondary"
          onPress={() => onSelect(option)}
          style={[a.rounded_full]}>
          <ButtonText>{option}</ButtonText>
        </Button>
      ))}
    </View>
  )
}

// Attachment preview component
export function SonetAttachmentPreview({
  attachments,
  onRemove,
}: {
  attachments: Array<{id: string; filename: string; size: number}>
  onRemove: (id: string) => void
}) {
  const t = useTheme()
  
  if (attachments.length === 0) return null

  return (
    <View style={[a.p_4, a.gap_sm]}>
      <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
        <Trans>Attachments ({attachments.length})</Trans>
      </Text>
      
      {attachments.map((attachment) => (
        <View
          key={attachment.id}
          style={[
            a.flex_row,
            a.items_center,
            a.justify_between,
            a.p_2,
            a.rounded_sm,
            t.atoms.bg_contrast_25,
          ]}>
          <Text style={[a.text_sm, t.atoms.text]} numberOfLines={1}>
            {attachment.filename}
          </Text>
          
          <View style={[a.flex_row, a.items_center, a.gap_sm]}>
            <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
              {(attachment.size / 1024).toFixed(1)} KB
            </Text>
            
            <Button
              size="small"
              variant="ghost"
              color="negative"
              onPress={() => onRemove(attachment.id)}>
              <ButtonText>
                <Trans>Remove</Trans>
              </ButtonText>
            </Button>
          </View>
        </View>
      ))}
    </View>
  )
}