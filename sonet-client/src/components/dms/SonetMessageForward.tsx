import React, {useCallback, useState, useMemo, useRef} from 'react'
import {View, TouchableOpacity, ScrollView, TextInput, Alert} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import AnimatedView, {
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideOutDown,
  Layout,
} from 'react-native-reanimated'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {ArrowUpRight_Stroke2_Corner0_Rounded as ForwardIcon} from '#/components/icons/ArrowUpRight'
import {X_Stroke2_Corner0_Rounded as CloseIcon} from '#/components/icons/Times'
import {Search_Stroke2_Corner0_Rounded as SearchIcon} from '#/components/icons/Search'
import {Check_Stroke2_Corner0_Rounded as CheckIcon} from '#/components/icons/Check'
import {User_Stroke2_Corner0_Rounded as UserIcon} from '#/components/icons/User'
import {Hashtag_Stroke2_Corner0_Rounded as HashtagIcon} from '#/components/icons/Hashtag'
import {Shield_Stroke2_Corner0_Rounded as ShieldIcon} from '#/components/icons/Shield'
import {Warning_Stroke2_Corner0_Rounded as WarningIcon} from '#/components/icons/Warning'

// Forwardable message interface with encryption details
interface ForwardableMessage {
  id: string
  content: string
  senderName: string
  timestamp: string
  type: 'text' | 'image' | 'file' | 'audio' | 'video'
  attachments?: Array<{
    id: string
    type: string
    url: string
    filename: string
    isEncrypted: boolean
    encryptionKey?: string
  }>
  reactions?: Array<{
    emoji: string
    userId: string
  }>
  isEncrypted: boolean
  encryptionKey?: string
  encryptionAlgorithm?: string
  threadId?: string
  threadDepth: number
  originalConversationId: string
}

// Conversation interface for forwarding with encryption status
interface ForwardConversation {
  id: string
  title: string
  type: 'direct' | 'group'
  participants: Array<{
    id: string
    name: string
    avatar?: string
    hasEncryptionKey: boolean
    encryptionStatus: 'verified' | 'unverified' | 'missing'
  }>
  lastActivity: string
  unreadCount: number
  isArchived: boolean
  encryptionEnabled: boolean
  encryptionAlgorithm?: string
  sharedEncryptionKey?: string
}

// Security validation result
interface SecurityValidation {
  isValid: boolean
  warnings: string[]
  errors: string[]
  encryptionIssues: string[]
  recommendations: string[]
}

interface SonetMessageForwardProps {
  isVisible: boolean
  onClose: () => void
  messages: ForwardableMessage[]
  conversations: ForwardConversation[]
  onForward: (conversationIds: string[], messages: ForwardableMessage[], securityContext: SecurityContext) => Promise<void>
}

// Security context for forwarding operation
interface SecurityContext {
  originalEncryption: boolean
  targetEncryption: boolean
  keyTransferRequired: boolean
  encryptionAlgorithm: string
  securityLevel: 'high' | 'medium' | 'low'
  warnings: string[]
}

export function SonetMessageForward({
  isVisible,
  onClose,
  messages,
  conversations,
  onForward,
}: SonetMessageForwardProps) {
  const t = useTheme()
  const {_} = useLingui()
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [isForwarding, setIsForwarding] = useState(false)
  const [forwardNote, setForwardNote] = useState('')
  const [securityWarnings, setSecurityWarnings] = useState<string[]>([])
  const [showSecurityDetails, setShowSecurityDetails] = useState(false)
  const searchInputRef = useRef<TextInput>(null)

  // Security validation for forwarding encrypted messages
  const securityValidation = useMemo((): SecurityValidation => {
    const warnings: string[] = []
    const errors: string[] = []
    const encryptionIssues: string[] = []
    const recommendations: string[] = []

    // Check if any messages are encrypted
    const hasEncryptedMessages = messages.some(msg => msg.isEncrypted)
    const hasUnencryptedMessages = messages.some(msg => !msg.isEncrypted)

    if (hasEncryptedMessages) {
      // Check encryption key availability
      const messagesWithoutKeys = messages.filter(msg => 
        msg.isEncrypted && !msg.encryptionKey
      )
      
      if (messagesWithoutKeys.length > 0) {
        errors.push(`${messagesWithoutKeys.length} encrypted messages missing encryption keys`)
        recommendations.push('Cannot forward encrypted messages without proper keys')
      }

      // Check target conversation encryption support
      const targetConversations = conversations.filter(conv => 
        selectedConversations.has(conv.id)
      )
      
      const conversationsWithoutEncryption = targetConversations.filter(conv => 
        !conv.encryptionEnabled
      )
      
      if (conversationsWithoutEncryption.length > 0) {
        warnings.push(`${conversationsWithoutEncryption.length} target conversations don't support encryption`)
        recommendations.push('Encrypted messages will be converted to plain text in these conversations')
      }

      // Check participant encryption key availability
      targetConversations.forEach(conv => {
        const participantsWithoutKeys = conv.participants.filter(p => !p.hasEncryptionKey)
        if (participantsWithoutKeys.length > 0) {
          warnings.push(`Conversation "${conv.title}" has ${participantsWithoutKeys.length} participants without encryption keys`)
        }
      })

      // Mixed encryption warning
      if (hasUnencryptedMessages) {
        warnings.push('Mixing encrypted and unencrypted messages may compromise security')
        recommendations.push('Consider forwarding only encrypted messages to maintain security')
      }
    }

    // Check for sensitive content
    const sensitiveKeywords = ['password', 'secret', 'private', 'confidential', 'key', 'token']
    const hasSensitiveContent = messages.some(msg => 
      sensitiveKeywords.some(keyword => 
        msg.content.toLowerCase().includes(keyword)
      )
    )
    
    if (hasSensitiveContent) {
      warnings.push('Messages may contain sensitive information')
      recommendations.push('Verify recipients and encryption before forwarding')
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors,
      encryptionIssues,
      recommendations,
    }
  }, [messages, conversations, selectedConversations])

  // Security context for forwarding
  const securityContext = useMemo((): SecurityContext => {
    const hasEncryptedMessages = messages.some(msg => msg.isEncrypted)
    const targetConversations = conversations.filter(conv => selectedConversations.has(conv.id))
    const allTargetsSupportEncryption = targetConversations.every(conv => conv.encryptionEnabled)
    
    let securityLevel: 'high' | 'medium' | 'low' = 'high'
    
    if (!hasEncryptedMessages) {
      securityLevel = 'medium'
    } else if (!allTargetsSupportEncryption) {
      securityLevel = 'low'
    }

    return {
      originalEncryption: hasEncryptedMessages,
      targetEncryption: allTargetsSupportEncryption,
      keyTransferRequired: hasEncryptedMessages && !allTargetsSupportEncryption,
      encryptionAlgorithm: 'AES-256-GCM', // Default algorithm
      securityLevel,
      warnings: securityValidation.warnings,
    }
  }, [messages, conversations, selectedConversations, securityValidation])

  // Filter conversations based on search
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations

    const query = searchQuery.toLowerCase()
    return conversations.filter(conv => {
      const titleMatch = conv.title.toLowerCase().includes(query)
      const participantMatch = conv.participants.some(p => 
        p.name.toLowerCase().includes(query)
      )
      return titleMatch || participantMatch
    })
  }, [conversations, searchQuery])

  // Handle conversation selection with security validation
  const handleConversationToggle = useCallback((conversationId: string) => {
    setSelectedConversations(prev => {
      const newSet = new Set(prev)
      if (newSet.has(conversationId)) {
        newSet.delete(conversationId)
      } else {
        newSet.add(conversationId)
      }
      return newSet
    })
  }, [])

  // Handle forward with security validation
  const handleForward = useCallback(async () => {
    if (selectedConversations.size === 0) return

    // Show security warnings if any
    if (securityValidation.warnings.length > 0 || securityValidation.errors.length > 0) {
      const warningText = [
        ...securityValidation.errors.map(e => `❌ ${e}`),
        ...securityValidation.warnings.map(w => `⚠️ ${w}`),
        ...securityValidation.recommendations.map(r => `💡 ${r}`),
      ].join('\n')

      Alert.alert(
        _('Security Warnings'),
        warningText,
        [
          { text: _('Cancel'), style: 'cancel' },
          { 
            text: _('Forward Anyway'), 
            style: 'destructive',
            onPress: () => performForward()
          }
        ]
      )
      return
    }

    await performForward()
  }, [selectedConversations, securityValidation, _])

  // Perform the actual forward operation
  const performForward = async () => {
    setIsForwarding(true)
    try {
      await onForward(Array.from(selectedConversations), messages, securityContext)
      onClose()
    } catch (error) {
      console.error('Forward failed:', error)
      Alert.alert(_('Error'), _('Failed to forward messages. Please try again.'))
    } finally {
      setIsForwarding(false)
    }
  }

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedConversations(new Set())
  }, [])

  // Get message preview with security indicators
  const getMessagePreview = useCallback((message: ForwardableMessage) => {
    if (message.type === 'text') {
      return message.content.length > 50 
        ? message.content.substring(0, 50) + '...'
        : message.content
    }
    
    const typeLabels = {
      image: '📷 Image',
      file: '📎 File',
      audio: '🎵 Audio',
      video: '🎥 Video',
    }
    
    return typeLabels[message.type] || 'Unknown type'
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
      
      {/* Forward Header */}
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
            <ForwardIcon size="sm" style={[t.atoms.text_primary]} />
            <Text style={[a.text_sm, a.font_bold, t.atoms.text]}>
              <Trans>Forward Messages</Trans>
            </Text>
          </View>
          
          <TouchableOpacity
            onPress={clearSelection}
            disabled={selectedConversations.size === 0}>
            <Text style={[
              a.text_xs,
              selectedConversations.size === 0
                ? t.atoms.text_contrast_50
                : t.atoms.text_primary,
            ]}>
              <Trans>Clear</Trans>
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Selection Summary */}
        <View style={[a.flex_row, a.items_center, a.gap_sm, a.mt_sm]}>
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            {messages.length} message{messages.length !== 1 ? 's' : ''} selected
          </Text>
          {selectedConversations.size > 0 && (
            <Text style={[a.text_xs, t.atoms.text_primary]}>
              • {selectedConversations.size} conversation{selectedConversations.size !== 1 ? 's' : ''} selected
            </Text>
          )}
        </View>
      </View>

      {/* Security Warning Banner */}
      {(securityValidation.warnings.length > 0 || securityValidation.errors.length > 0) && (
        <View style={[
          a.mx_md,
          a.mt_sm,
          a.px_md,
          a.py_sm,
          a.rounded_2xl,
          a.border,
          securityValidation.errors.length > 0 
            ? [t.atoms.bg_negative_25, t.atoms.border_negative]
            : [t.atoms.bg_warning_25, t.atoms.border_warning],
          a.flex_row,
          a.items_center,
          a.gap_sm,
        ]}>
          {securityValidation.errors.length > 0 ? (
            <WarningIcon size="sm" style={[t.atoms.text_negative]} />
          ) : (
            <WarningIcon size="sm" style={[t.atoms.text_warning]} />
          )}
          <Text style={[
            a.text_xs,
            securityValidation.errors.length > 0 
              ? t.atoms.text_negative
              : t.atoms.text_warning,
            a.flex_1,
          ]}>
            {securityValidation.errors.length > 0 
              ? `${securityValidation.errors.length} security error(s) detected`
              : `${securityValidation.warnings.length} security warning(s) detected`
            }
          </Text>
          <TouchableOpacity onPress={() => setShowSecurityDetails(!showSecurityDetails)}>
            <Text style={[
              a.text_xs,
              securityValidation.errors.length > 0 
                ? t.atoms.text_negative
                : t.atoms.text_warning,
              a.font_bold,
            ]}>
              {showSecurityDetails ? _('Hide') : _('Details')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Security Details */}
      {showSecurityDetails && (securityValidation.warnings.length > 0 || securityValidation.errors.length > 0) && (
        <View style={[
          a.mx_md,
          a.mt_sm,
          a.px_md,
          a.py_sm,
          a.rounded_2xl,
          a.border,
          t.atoms.bg_contrast_25,
          t.atoms.border_contrast_25,
        ]}>
          <Text style={[a.text_xs, a.font_bold, t.atoms.text, a.mb_sm]}>
            <Trans>Security Analysis</Trans>
          </Text>
          
          {securityValidation.errors.map((error, index) => (
            <Text key={`error-${index}`} style={[a.text_xs, t.atoms.text_negative, a.mb_xs]}>
              ❌ {error}
            </Text>
          ))}
          
          {securityValidation.warnings.map((warning, index) => (
            <Text key={`warning-${index}`} style={[a.text_xs, t.atoms.text_warning, a.mb_xs]}>
              ⚠️ {warning}
            </Text>
          ))}
          
          {securityValidation.recommendations.map((rec, index) => (
            <Text key={`rec-${index}`} style={[a.text_xs, t.atoms.text_primary, a.mb_xs]}>
              💡 {rec}
            </Text>
          ))}
        </View>
      )}

      {/* Messages Preview with Security Indicators */}
      <View style={[
        a.px_md,
        a.py_sm,
        a.border_b,
        t.atoms.border_contrast_25,
        t.atoms.bg_contrast_25,
      ]}>
        <Text style={[a.text_xs, a.font_bold, t.atoms.text, a.mb_sm]}>
          <Trans>Messages to Forward</Trans>
        </Text>
        
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[a.gap_sm]}>
          {messages.map((message, index) => (
            <View
              key={message.id}
              style={[
                a.px_sm,
                a.py_xs,
                a.rounded_xl,
                a.border,
                a.min_w_32,
                t.atoms.bg,
                t.atoms.border_contrast_25,
              ]}>
              <View style={[a.flex_row, a.items_center, a.gap_xs, a.mb_xs]}>
                <Text style={[a.text_xs, a.font_bold, t.atoms.text]}>
                  {message.senderName}
                </Text>
                {message.isEncrypted && (
                  <ShieldIcon size="xs" style={[t.atoms.text_positive]} />
                )}
                {!message.isEncrypted && (
                  <Text style={[a.text_xs, t.atoms.text_warning]}>🔓</Text>
                )}
              </View>
              
              <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                {getMessagePreview(message)}
              </Text>
              
              {message.attachments && message.attachments.length > 0 && (
                <View style={[a.flex_row, a.items_center, a.gap_xs, a.mt_xs]}>
                  <FileIcon size="xs" style={[t.atoms.text_contrast_medium]} />
                  <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                    {message.attachments.length} attachment{message.attachments.length !== 1 ? 's' : ''}
                  </Text>
                  {message.attachments.some(att => att.isEncrypted) && (
                    <ShieldIcon size="xs" style={[t.atoms.text_positive]} />
                  )}
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Forward Note Input */}
      <View style={[
        a.px_md,
        a.py_sm,
        a.border_b,
        t.atoms.border_contrast_25,
        t.atoms.bg,
      ]}>
        <Text style={[a.text_xs, a.font_bold, t.atoms.text, a.mb_sm]}>
          <Trans>Add a note (optional)</Trans>
        </Text>
        
        <TextInput
          value={forwardNote}
          onChangeText={setForwardNote}
          placeholder={_('Add context or explanation...')}
          placeholderTextColor={t.atoms.text_contrast_medium.color}
          multiline
          maxLength={200}
          style={[
            a.px_sm,
            a.py_xs,
            a.rounded_xl,
            a.border,
            a.min_h_8,
            t.atoms.bg_contrast_25,
            t.atoms.text,
            t.atoms.border_contrast_25,
          ]}
        />
        
        <Text style={[a.text_xs, t.atoms.text_contrast_medium, a.mt_xs, a.text_right]}>
          {forwardNote.length}/200
        </Text>
      </View>

      {/* Conversation Search */}
      <View style={[
        a.px_md,
        a.py_sm,
        a.border_b,
        t.atoms.border_contrast_25,
        t.atoms.bg,
      ]}>
        <View style={[a.relative]}>
          <SearchIcon
            size="sm"
            style={[
              a.absolute,
              a.left_3,
              a.top_3,
              t.atoms.text_contrast_medium,
            ]}
          />
          <TextInput
            ref={searchInputRef}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={_('Search conversations...')}
            placeholderTextColor={t.atoms.text_contrast_medium.color}
            style={[
              a.pl_10,
              a.pr_4,
              a.py_sm,
              a.rounded_2xl,
              a.border,
              t.atoms.bg_contrast_25,
              t.atoms.text,
              t.atoms.border_contrast_25,
            ]}
          />
        </View>
      </View>

      {/* Conversations List */}
      <ScrollView style={[a.flex_1]} showsVerticalScrollIndicator={false}>
        <View style={[a.p_md, a.gap_sm]}>
          {filteredConversations.map(conversation => {
            const isSelected = selectedConversations.has(conversation.id)
            
            return (
              <TouchableOpacity
                key={conversation.id}
                onPress={() => handleConversationToggle(conversation.id)}
                style={[
                  a.p_md,
                  a.rounded_2xl,
                  a.border,
                  a.flex_row,
                  a.items_center,
                  a.gap_sm,
                  isSelected
                    ? [t.atoms.bg_primary_25, t.atoms.border_primary]
                    : [t.atoms.bg_contrast_25, t.atoms.border_contrast_25],
                ]}>
                
                {/* Selection Checkbox */}
                <View style={[
                  a.w_5,
                  a.h_5,
                  a.rounded_sm,
                  a.border,
                  a.items_center,
                  a.justify_center,
                  isSelected
                    ? [t.atoms.bg_primary, t.atoms.border_primary]
                    : [t.atoms.bg_contrast_25, t.atoms.border_contrast_25],
                ]}>
                  {isSelected && (
                    <CheckIcon size="xs" style={[t.atoms.text_on_primary]} />
                  )}
                </View>

                {/* Conversation Info */}
                <View style={[a.flex_1]}>
                  <View style={[a.flex_row, a.items_center, a.gap_sm, a.mb_xs]}>
                    <Text style={[
                      a.text_sm,
                      a.font_bold,
                      isSelected ? t.atoms.text_primary : t.atoms.text,
                    ]}>
                      {conversation.title}
                    </Text>
                    
                    <View style={[a.flex_row, a.items_center, a.gap_xs]}>
                      {conversation.type === 'group' && (
                        <HashtagIcon size="xs" style={[t.atoms.text_contrast_medium]} />
                      )}
                      {conversation.type === 'direct' && (
                        <UserIcon size="xs" style={[t.atoms.text_contrast_medium]} />
                      )}
                      {conversation.isArchived && (
                        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                          Archived
                        </Text>
                      )}
                      {/* Encryption Status */}
                      {conversation.encryptionEnabled ? (
                        <ShieldIcon size="xs" style={[t.atoms.text_positive]} />
                      ) : (
                        <Text style={[a.text_xs, t.atoms.text_warning]}>🔓</Text>
                      )}
                    </View>
                  </View>
                  
                  <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                    {conversation.participants.length} participant{conversation.participants.length !== 1 ? 's' : ''}
                    {conversation.unreadCount > 0 && (
                      <Text style={[t.atoms.text_primary]}>
                        • {conversation.unreadCount} unread
                      </Text>
                    )}
                  </Text>
                  
                  <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                    Last active: {new Date(conversation.lastActivity).toLocaleDateString()}
                  </Text>
                  
                  {/* Encryption Details */}
                  {conversation.encryptionEnabled && (
                    <Text style={[a.text_xs, t.atoms.text_positive]}>
                      🔒 End-to-end encrypted
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>

      {/* Forward Button with Security Validation */}
      <View style={[
        a.px_md,
        a.py_sm,
        a.border_t,
        t.atoms.border_contrast_25,
        t.atoms.bg,
      ]}>
        
        {/* Security Summary */}
        <View style={[
          a.px_md,
          a.py_sm,
          a.rounded_2xl,
          a.border,
          t.atoms.bg_contrast_25,
          t.atoms.border_contrast_25,
          a.mb_sm,
        ]}>
          <View style={[a.flex_row, a.items_center, a.gap_sm, a.mb_xs]}>
            <ShieldIcon size="xs" style={[
              securityContext.securityLevel === 'high' ? t.atoms.text_positive :
              securityContext.securityLevel === 'medium' ? t.atoms.text_warning :
              t.atoms.text_negative
            ]} />
            <Text style={[
              a.text_xs,
              a.font_bold,
              securityContext.securityLevel === 'high' ? t.atoms.text_positive :
              securityContext.securityLevel === 'medium' ? t.atoms.text_warning :
              t.atoms.text_negative
            ]}>
              Security Level: {securityContext.securityLevel.toUpperCase()}
            </Text>
          </View>
          
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            {securityContext.originalEncryption ? '🔒' : '🔓'} Original: {securityContext.originalEncryption ? 'Encrypted' : 'Plain text'}
            {' → '}
            {securityContext.targetEncryption ? '🔒' : '🔓'} Target: {securityContext.targetEncryption ? 'Encrypted' : 'Plain text'}
          </Text>
          
          {securityContext.keyTransferRequired && (
            <Text style={[a.text_xs, t.atoms.text_warning, a.mt_xs]}>
              ⚠️ Encryption key transfer required
            </Text>
          )}
        </View>
        
        <TouchableOpacity
          onPress={handleForward}
          disabled={selectedConversations.size === 0 || isForwarding || !securityValidation.isValid}
          style={[
            a.w_full,
            a.py_sm,
            a.rounded_2xl,
            a.items_center,
            a.justify_center,
            (selectedConversations.size > 0 && !isForwarding && securityValidation.isValid)
              ? t.atoms.bg_primary
              : t.atoms.bg_contrast_25,
          ]}>
          <Text style={[
            a.text_sm,
            a.font_bold,
            (selectedConversations.size > 0 && !isForwarding && securityValidation.isValid)
              ? t.atoms.text_on_primary
              : t.atoms.text_contrast_medium,
          ]}>
            {isForwarding ? (
              <Trans>Forwarding...</Trans>
            ) : !securityValidation.isValid ? (
              <Trans>Security Issues Detected</Trans>
            ) : (
              <Trans>Forward to {selectedConversations.size} conversation{selectedConversations.size !== 1 ? 's' : ''}</Trans>
            )}
          </Text>
        </TouchableOpacity>
      </View>
    </AnimatedView>
  )
}

// Export types for use in other components
export type {ForwardableMessage, ForwardConversation, SecurityContext, SecurityValidation}