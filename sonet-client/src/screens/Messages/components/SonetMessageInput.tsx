import React, {useCallback, useState} from 'react'
import {View, TextInput, TouchableOpacity} from 'react-native'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {Button} from '#/components/Button'

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

      {/* Text Input */}
      <View style={[a.flex_1, a.relative]}>
        <TextInput
          value={text}
          onChangeText={setText}
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
                <TouchableOpacity onPress={() => removeAttachment(idx)}>
                  <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
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