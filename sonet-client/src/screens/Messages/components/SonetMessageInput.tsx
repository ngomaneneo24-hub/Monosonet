import React, {useCallback, useState, useRef} from 'react'
import {View, TextInput, Keyboard} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {useE2EEncryption} from '#/services/sonetE2E'
import {useUnifiedSession} from '#/state/session/hybrid'
import {useSonetChatRealtime} from '#/state/messages/sonet/realtime'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {Lock_Stroke2_Corner0_Rounded as LockIcon} from '#/components/icons/Lock'
import {PaperPlane_Stroke2_Corner0_Rounded as SendIcon} from '#/components/icons/PaperPlane'
import {Shield_Stroke2_Corner0_Rounded as ShieldIcon} from '#/components/icons/Shield'
import {Text} from '#/components/Typography'

interface SonetMessageInputProps {
  chatId: string
  onSendMessage: (content: string, encryption?: 'none' | 'aes256' | 'e2e') => Promise<void>
  disabled?: boolean
  placeholder?: string
}

export function SonetMessageInput({
  chatId,
  onSendMessage,
  disabled = false,
  placeholder,
}: SonetMessageInputProps) {
  const {_} = useLingui()
  const t = useTheme()
  const {e2e, isInitialized: e2eInitialized} = useE2EEncryption()
  const {state: sessionState} = useUnifiedSession()
  const {sendTyping} = useSonetChatRealtime(chatId)

  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [encryptionType, setEncryptionType] = useState<'none' | 'aes256' | 'e2e'>('e2e')
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleSend = useCallback(async () => {
    if (!message.trim() || isSending || disabled) return

    setIsSending(true)
    try {
      await onSendMessage(message.trim(), encryptionType)
      setMessage('')
      
      // Stop typing indicator
      setIsTyping(false)
      sendTyping(false)
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }, [message, isSending, disabled, encryptionType, onSendMessage, sendTyping])

  const handleTextChange = useCallback((text: string) => {
    setMessage(text)
    
    // Handle typing indicator
    if (text.length > 0 && !isTyping) {
      setIsTyping(true)
      sendTyping(true)
    } else if (text.length === 0 && isTyping) {
      setIsTyping(false)
      sendTyping(false)
    }

    // Clear typing timeout and set new one
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      sendTyping(false)
    }, 2000)
  }, [isTyping, sendTyping])

  const toggleEncryption = useCallback(() => {
    if (encryptionType === 'none') {
      setEncryptionType('aes256')
    } else if (encryptionType === 'aes256') {
      setEncryptionType('e2e')
    } else {
      setEncryptionType('none')
    }
  }, [encryptionType])

  const getEncryptionIcon = () => {
    switch (encryptionType) {
      case 'e2e':
        return <ShieldIcon size="sm" fill={t.atoms.text_positive.color} />
      case 'aes256':
        return <LockIcon size="sm" fill={t.atoms.text_warning.color} />
      case 'none':
        return <LockIcon size="sm" fill={t.atoms.text_contrast_low.color} />
    }
  }

  const getEncryptionLabel = () => {
    switch (encryptionType) {
      case 'e2e':
        return _(msg`E2E Encrypted`)
      case 'aes256':
        return _(msg`AES-256 Encrypted`)
      case 'none':
        return _(msg`No Encryption`)
    }
  }

  const canSend = message.trim().length > 0 && !isSending && !disabled
  const showE2EIndicator = encryptionType === 'e2e' && e2eInitialized

  return (
    <View style={[a.border_t, t.atoms.border_contrast_low, a.p_4, a.gap_sm]}>
      {/* Encryption Status */}
      <View style={[a.flex_row, a.items_center, a.justify_between]}>
        <View style={[a.flex_row, a.items_center, a.gap_xs]}>
          {getEncryptionIcon()}
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            {getEncryptionLabel()}
          </Text>
        </View>
        
        <Button
          size="small"
          variant="ghost"
          color="secondary"
          onPress={toggleEncryption}
          disabled={!e2eInitialized}>
          <ButtonText>
            <Trans>Change</Trans>
          </ButtonText>
        </Button>
      </View>

      {/* E2E Status */}
      {showE2EIndicator && (
        <View style={[a.flex_row, a.items_center, a.gap_xs, a.p_2, a.rounded_sm, t.atoms.bg_positive_25]}>
          <ShieldIcon size="xs" fill={t.atoms.text_positive.color} />
          <Text style={[a.text_xs, t.atoms.text_positive]}>
            <Trans>End-to-end encryption enabled</Trans>
          </Text>
        </View>
      )}

      {/* Message Input */}
      <View style={[a.flex_row, a.items_end, a.gap_sm]}>
        <View style={[a.flex_1, a.rounded_md, t.atoms.bg_contrast_25, t.atoms.border_contrast_low]}>
          <TextInput
            value={message}
            onChangeText={handleTextChange}
            placeholder={placeholder || _(msg`Type a message...`)}
            placeholderTextColor={t.atoms.text_contrast_low.color}
            multiline
            maxLength={1000}
            style={[
              a.p_3,
              a.text_md,
              t.atoms.text,
              {minHeight: 40, maxHeight: 120},
            ]}
            editable={!disabled}
          />
        </View>

        <Button
          size="lg"
          variant="solid"
          color="primary"
          onPress={handleSend}
          disabled={!canSend}
          style={[a.rounded_full, {width: 44, height: 44}]}>
          <ButtonIcon icon={SendIcon} />
        </Button>
      </View>

      {/* Character Count */}
      <View style={[a.flex_row, a.justify_between, a.items_center]}>
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          {message.length}/1000
        </Text>
        
        {isSending && (
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            <Trans>Sending...</Trans>
          </Text>
        )}
      </View>
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