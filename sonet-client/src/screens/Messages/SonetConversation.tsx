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
import {useSonetListConvos} from '#/state/queries/messages/sonet'
import {sonetMessagingApi} from '#/services/sonetMessagingApi'

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
  
  // Get conversation data
  const {state: conversationsState, actions: conversationsActions} = useSonetListConvos()
  
  // Find current conversation
  const currentConversation = conversationsState.chats.find(chat => chat.id === conversationId)
  
  // Username sending message
  const usernameSendMessage = useCallback(async (content: string, attachments?: any[]) => {
    try {
      await sonetMessagingApi.sendMessage({
        chatId: conversationId,
        content,
        type: 'text',
        encrypt: true,
      })
      await conversationsActions.refreshChats()
    } catch (error) {
      console.error('Failed to send message:', error)
      Alert.alert(_('Error'), _('Failed to send message. Please try again.'))
    }
  }, [conversationId, conversationsActions, _])
  
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
        {/* Messages List */}
        <View style={[a.flex_1, a.px_md, a.gap_sm]}>
          {currentConversation.messages?.map((message, index) => (
            <SonetMessageItem
              key={message.id || index}
              message={message}
              isOwnMessage={message.senderId === 'current_user'}
            />
          ))}
          
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
      />
    </Layout.Screen>
  )
}