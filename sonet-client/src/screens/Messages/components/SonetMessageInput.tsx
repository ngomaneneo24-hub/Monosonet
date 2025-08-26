import React, {useCallback, useState} from 'react'
import {View, TextInput, TouchableOpacity} from 'react-native'
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
  const [attachments, setAttachments] = useState<File[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [recordingStart, setRecordingStart] = useState<number | null>(null)
  const [recordingMs, setRecordingMs] = useState(0)
  const recordingTimerRef = React.useRef<number | null>(null)
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null)
  const recordedChunksRef = React.useRef<BlobPart[]>([])

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

  const toggleRecord = useCallback(async () => {
    if (isRecording) {
      // Stop
      try {
        mediaRecorderRef.current?.stop()
      } catch {}
      setIsRecording(false)
      setRecordingStart(null)
      stopTimer()
    } else {
      // Start
      try {
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
            setAttachments(prev => [...prev, file])
            stream.getTracks().forEach(t => t.stop())
          } catch {}
        }
        mr.start()
        setIsRecording(true)
        const now = Date.now()
        setRecordingStart(now)
        setRecordingMs(0)
        startTimer()
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
        setAttachments(prev => [...prev, ...files])
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
      // If attachments exist, upload them first with progress then send
      const uploaded: File[] = []
      const progressState: number[] = attachments.map(() => 0)
      // Render progress via local state by mapping filenames -> pct
      // For brevity, we reuse attachments chips and append pct text
      // Upload sequentially to keep UI simple
      for (let i = 0; i < attachments.length; i++) {
        const f = attachments[i]
        await sonetMessagingApi.uploadAttachment(
          f,
          (undefined as any),
          true,
          pct => {
            progressState[i] = pct
            // Trigger re-render
            setAttachments(prev => [...prev])
          },
        )
        uploaded.push(f)
      }
      await onSendMessage(text.trim(), attachments)
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

      {/* Voice Recorder */}
      <Button
        onPress={toggleRecord}
        style={[a.w_10, a.h_10, a.rounded_full, a.items_center, a.justify_center, isRecording ? t.atoms.bg_warning : t.atoms.bg_contrast_25]}>
        <Text style={[a.text_sm, isRecording ? t.atoms.text : t.atoms.text_contrast_medium]}>
          {isRecording ? '◼' : '🎤'}
        </Text>
      </Button>

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
            {attachments.map((f, idx) => (
              <View key={idx} style={[a.flex_row, a.items_center, a.gap_1, a.px_2, a.py_1, a.rounded_full, t.atoms.bg_contrast_25]}>
                <Text style={[a.text_xs, t.atoms.text]} numberOfLines={1}>
                  {f.name}
                </Text>
                {/* Placeholder progress since we mutate by re-render; real impl would track pct per file */}
                <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>↥</Text>
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