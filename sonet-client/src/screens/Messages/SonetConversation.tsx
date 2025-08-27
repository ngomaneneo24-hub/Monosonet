import React, {useCallback, useEffect, useState} from 'react'
import {View, Alert} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'

import {useAppState} from '#/lib/hooks/useAppState'
import {type CommonNavigatorParams} from '#/lib/routes/types'
import {atoms as a, useTheme} from '#/alf'
import {AgeRestrictedScreen} from '#/components/ageAssurance/AgeRestrictedScreen'
import {useAgeAssuranceCopy} from '#/components/ageAssurance/useAgeAssuranceCopy'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'
import {SonetMessageInput} from '#/components/dms/SonetMessageInput'
import {SonetMessageItem} from '#/components/dms/SonetMessageItem'
import {SonetChatStatusInfo} from '#/components/dms/SonetChatStatusInfo'
import {SonetChatEmptyPill} from '#/components/dms/SonetChatEmptyPill'
import {SonetChatDisabled} from '#/components/dms/SonetChatDisabled'
import {SonetSystemMessage} from '#/components/dms/SonetSystemMessage'
import {SonetTypingIndicator} from '#/components/dms/SonetTypingIndicator'
import {SonetMessageSearch} from '#/components/dms/SonetMessageSearch'
import {SonetMessageEdit} from '#/components/dms/SonetMessageEdit'
import {SonetMessagePinList} from '#/components/dms/SonetMessagePin'
import {useSonetListConvos} from '#/state/queries/messages/sonet'
import {useMessageDraft} from '#/state/messages/message-drafts'
import {sonetMessagingApi} from '#/services/sonetMessagingApi'
import {sonetWebSocket} from '#/services/sonetWebSocket'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'SonetConversation'>

export function SonetConversationScreen(props: Props) {
  const {_} = useLingui()
  const aaCopy = useAgeAssuranceCopy()
  
  return (
    <AgeRestrictedScreen
      screenTitle={_(msg`Chat`)}
      infoText={aaCopy.chatsInfoText}>
      <SonetConversationScreenInner {...props} />
    </AgeRestrictedScreen>
  )
}

export function SonetConversationScreenInner({route}: Props) {
  const t = useTheme()
  const navigation = useNavigation()
  const {conversation: conversationId} = route.params
  
  // State for conversation
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isEncrypted, setIsEncrypted] = useState(true)
  const [isTyping, setIsTyping] = useState(false)
  
  // State for new features
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [replyToMessage, setReplyToMessage] = useState<any>(null)
  const [pinnedMessages, setPinnedMessages] = useState<any[]>([])
  
  // Draft management
  const {saveDraft, loadDraft, clearDraft} = useMessageDraft(conversationId)
  
  // Get conversation data
  const {state: conversationsState, actions: conversationsActions} = useSonetListConvos()
  
  // Typing indicators for current chat
  const [typers, setTypers] = React.useState<string[]>([])
  React.useEffect(() => {
    const onTyping = (evt: any) => {
      if (evt.chat_id !== conversationId) return
      setTypers(prev => {
        const name = evt.user_name || 'Someone'
        if (evt.is_typing) {
          if (prev.includes(name)) return prev
          return [...prev, name]
        } else {
          return prev.filter(n => n !== name)
        }
      })
    }
    sonetWebSocket.on('typing', onTyping)
    return () => {
      sonetWebSocket.off('typing', onTyping)
    }
  }, [conversationId])
  
  // Find current conversation
  const currentConversation = conversationsState.chats.find(chat => chat.id === conversationId)
  
  // Username sending message
  const usernameSendMessage = useCallback(async (content: string, attachments?: File[], replyTo?: any) => {
    try {
      await sonetMessagingApi.sendMessage({
        chatId: conversationId,
        content,
        type: attachments && attachments.length > 0 ? 'file' : 'text',
        encrypt: true,
        attachments,
        replyTo: replyTo?.id,
      })
      await conversationsActions.refreshChats()
      clearDraft() // Clear draft after sending
    } catch (error) {
      console.error('Failed to send message:', error)
      Alert.alert(_('Error'), _('Failed to send message. Please try again.'))
    }
  }, [conversationId, conversationsActions, clearDraft, _])
  
  // Username encryption toggle
  const usernameToggleEncryption = useCallback(() => {
    setIsEncrypted(!isEncrypted)
  }, [isEncrypted])
  
  // Username search result press
  const usernameSearchResultPress = useCallback((result: any) => {
    // Expect result to contain messageId and maybe chatId
    const messageId = result?.messageId || result?.id
    if (messageId) {
      // In a production implementation, we'd scroll a virtualized list and flash highlight.
      // For now, navigate to same screen with param to hint focus; future: wire MessagesList ref.
      navigation.navigate('SonetConversation' as any, {
        conversation: conversationId,
        highlight: messageId,
      })
    }
    setIsSearchOpen(false)
  }, [navigation, conversationId])
  
  // Handle message reply
  const handleMessageReply = useCallback((message: any) => {
    setReplyToMessage({
      id: message.id,
      content: message.content,
      senderName: message.senderName || 'User',
    })
  }, [])
  
  // Handle message edit
  const handleMessageEdit = useCallback((message: any) => {
    setEditingMessageId(message.id)
  }, [])
  
  // Handle message delete
  const handleMessageDelete = useCallback(async (message: any) => {
    try {
      await sonetMessagingApi.deleteMessage(message.id)
      await conversationsActions.refreshChats()
      Alert.alert(_('Success'), _('Message deleted successfully'))
    } catch (error) {
      console.error('Failed to delete message:', error)
      Alert.alert(_('Error'), _('Failed to delete message. Please try again.'))
    }
  }, [conversationsActions, _])
  
  // Handle message pin
  const handleMessagePin = useCallback(async (message: any) => {
    try {
      // TODO: Implement pin message API call
      const pinnedMessage = {
        id: message.id,
        content: message.content,
        senderName: message.senderName || 'User',
        timestamp: message.timestamp,
      }
      setPinnedMessages(prev => [...prev, pinnedMessage])
      Alert.alert(_('Success'), _('Message pinned successfully'))
    } catch (error) {
      console.error('Failed to pin message:', error)
      Alert.alert(_('Error'), _('Failed to pin message. Please try again.'))
    }
  }, [])
  
  // Handle message unpin
  const handleMessageUnpin = useCallback((messageId: string) => {
    setPinnedMessages(prev => prev.filter(msg => msg.id !== messageId))
  }, [])
  
  // Handle message edit save
  const handleMessageEditSave = useCallback(async (messageId: string, newContent: string) => {
    try {
      await sonetMessagingApi.editMessage(messageId, newContent)
      await conversationsActions.refreshChats()
      setEditingMessageId(null)
      Alert.alert(_('Success'), _('Message edited successfully'))
    } catch (error) {
      console.error('Failed to edit message:', error)
      Alert.alert(_('Error'), _('Failed to edit message. Please try again.'))
    }
  }, [conversationsActions, _])
  
  // Handle message edit cancel
  const handleMessageEditCancel = useCallback(() => {
    setEditingMessageId(null)
  }, [])
  
  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      conversationsActions.refreshChats()
    }, [conversationsActions])
  )
  
  // App state handling
  useAppState({
    onActive: () => {
      conversationsActions.refreshChats()
    },
  })
  
  // Show search overlay if open
  if (isSearchOpen) {
    return (
      <SonetMessageSearch
        chatId={conversationId}
        onResultPress={usernameSearchResultPress}
        onClose={() => setIsSearchOpen(false)}
      />
    )
  }
  
  // Show loading state
  if (conversationsState.isLoading) {
    return (
      <Layout.Screen testID="sonetConversationScreen">
        <Layout.Header.Outer>
          <Layout.Header.BackButton />
          <Layout.Header.Content>
            <Layout.Header.TitleText>
              <Trans>Loading...</Trans>
            </Layout.Header.TitleText>
          </Layout.Header.Content>
        </Layout.Header.Outer>
        <View style={[a.flex_1, a.items_center, a.justify_center]}>
          <Text style={[a.text_lg, t.atoms.text_contrast_medium]}>
            <Trans>Loading conversation...</Trans>
          </Text>
        </View>
      </Layout.Screen>
    )
  }
  
  // Show error state
  if (conversationsState.error) {
    return (
      <Layout.Screen testID="sonetConversationScreen">
        <Layout.Header.Outer>
          <Layout.Header.BackButton />
          <Layout.Header.Content>
            <Layout.Header.TitleText>
              <Trans>Error</Trans>
            </Layout.Header.TitleText>
          </Layout.Header.Content>
        </Layout.Header.Outer>
        <View style={[a.flex_1, a.items_center, a.justify_center, a.gap_md, a.px_md]}>
          <Text style={[a.text_lg, t.atoms.text_negative, a.text_center]}>
            <Trans>Failed to load conversation</Trans>
          </Text>
          <Text style={[a.text_sm, t.atoms.text_contrast_medium, a.text_center]}>
            {conversationsState.error}
          </Text>
        </View>
      </Layout.Screen>
    )
  }
  
  // Show not found state
  if (!currentConversation) {
    return (
      <Layout.Screen testID="sonetConversationScreen">
        <Layout.Header.Outer>
          <Layout.Header.BackButton />
          <Layout.Header.Content>
            <Layout.Header.TitleText>
              <Trans>Conversation Not Found</Trans>
            </Layout.Header.TitleText>
          </Layout.Header.Content>
        </Layout.Header.Outer>
        <View style={[a.flex_1, a.items_center, a.justify_center, a.gap_md, a.px_md]}>
          <Text style={[a.text_lg, t.atoms.text_contrast_medium, a.text_center]}>
            <Trans>This conversation could not be found</Trans>
          </Text>
          <Text style={[a.text_sm, t.atoms.text_contrast_medium, a.text_center]}>
            <Trans>It may have been deleted or you may not have access to it</Trans>
          </Text>
        </View>
      </Layout.Screen>
    )
  }
  
  // Show disabled state
  if (currentConversation.status === 'disabled') {
    return (
      <Layout.Screen testID="sonetConversationScreen">
        <Layout.Header.Outer>
          <Layout.Header.BackButton />
          <Layout.Header.Content>
            <Layout.Header.TitleText>
              {currentConversation.title || _('Chat')}
            </Layout.Header.TitleText>
          </Layout.Header.Content>
        </Layout.Header.Outer>
        <SonetChatDisabled />
      </Layout.Screen>
    )
  }
  
  // Show empty state
  if (!currentConversation.messages || currentConversation.messages.length === 0) {
    return (
      <Layout.Screen testID="sonetConversationScreen">
        <Layout.Header.Outer>
          <Layout.Header.BackButton />
          <Layout.Header.Content>
            <Layout.Header.TitleText>
              {currentConversation.title || _('Chat')}
            </Layout.Header.TitleText>
          </Layout.Header.Content>
          <Layout.Header.Right>
            <Layout.Header.Button
              onPress={() => setIsSearchOpen(true)}
              accessibilityLabel={_('Search messages')}
              accessibilityHint={_('Search for messages in this conversation')}>
              <Layout.Header.ButtonText>
                <Trans>Search</Trans>
              </Layout.Header.ButtonText>
            </Layout.Header.Button>
          </Layout.Header.Right>
        </Layout.Header.Outer>
        
        <View style={[a.flex_1]}>
          <SonetChatEmptyPill />
        </View>
        
        <SonetMessageInput
          chatId={conversationId}
          onSendMessage={usernameSendMessage}
          isEncrypted={isEncrypted}
          encryptionEnabled={true}
          onToggleEncryption={usernameToggleEncryption}
          onDraftSave={saveDraft}
          onDraftLoad={loadDraft}
        />
      </Layout.Screen>
    )
  }
  
  // Show conversation with messages
  return (
    <Layout.Screen testID="sonetConversationScreen">
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            {currentConversation.title || _('Chat')}
          </Layout.Header.TitleText>
          {typers.length > 0 && (
            <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
              {typers.join(', ')} typing...
            </Text>
          )}
        </Layout.Header.Content>
        <Layout.Header.Right>
          <Layout.Header.Button
            onPress={() => setIsSearchOpen(true)}
            accessibilityLabel={_('Search messages')}
            accessibilityHint={_('Search for messages in this conversation')}>
            <Layout.Header.ButtonText>
              <Trans>Search</Trans>
            </Layout.Header.ButtonText>
          </Layout.Header.Button>
        </Layout.Header.Right>
      </Layout.Header.Outer>
      
      <View style={[a.flex_1]}>
        {/* Pinned Messages */}
        <SonetMessagePinList
          pinnedMessages={pinnedMessages}
          onUnpin={handleMessageUnpin}
          onPress={(messageId) => {
            // TODO: Scroll to pinned message
            console.log('Scroll to message:', messageId)
          }}
        />
        
        {/* Messages List */}
        <View style={[a.flex_1, a.px_md, a.gap_sm]}>
          {currentConversation.messages?.map((message, index) => {
            const isEditing = editingMessageId === message.id
            const isOwnMessage = message.senderId === 'current_user'
            
            return (
              <React.Fragment key={message.id || index}>
                {/* Message Item */}
                <SonetMessageItem
                  message={message}
                  isOwnMessage={isOwnMessage}
                  onReply={handleMessageReply}
                  onEdit={handleMessageEdit}
                  onDelete={handleMessageDelete}
                  onPin={handleMessagePin}
                />
                
                {/* Message Edit Component */}
                {isEditing && (
                  <SonetMessageEdit
                    messageId={message.id}
                    initialContent={message.content}
                    onSave={handleMessageEditSave}
                    onCancel={handleMessageEditCancel}
                    isVisible={isEditing}
                  />
                )}
              </React.Fragment>
            )
          })}
          
          {/* Typing Indicator */}
          {isTyping && (
            <SonetTypingIndicator
              senderName={currentConversation.participants?.[0]?.displayName || 'Someone'}
            />
          )}
        </View>
      </View>
      
      <SonetMessageInput
        chatId={conversationId}
        onSendMessage={usernameSendMessage}
        isEncrypted={isEncrypted}
        encryptionEnabled={true}
        onToggleEncryption={usernameToggleEncryption}
        onDraftSave={saveDraft}
        onDraftLoad={loadDraft}
      />
    </Layout.Screen>
  )
}