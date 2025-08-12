import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useNavigation, useRoute } from '@react-navigation/native';
import screenshotProtection from '@/services/screenshotProtection';
import { Message, User } from '@/types';
import { sonetMessagingApi } from '@/services/sonetMessagingApi';

// ... existing imports and types ...

const DirectMessageScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  
  // Get recipient info from route params
  const recipient = route.params?.recipient as User;
  const chatId = route.params?.chatId as string;

  // Screenshot protection state
  const [protectionActive, setProtectionActive] = useState(false);

  useEffect(() => {
    if (recipient && chatId) {
      loadMessages();
      enableScreenshotProtection();
    }
    
    return () => {
      // Disable screenshot protection when leaving DM
      disableScreenshotProtection();
    };
  }, [recipient, chatId]);

  const enableScreenshotProtection = async () => {
    try {
      const config = screenshotProtection.getConfig();
      if (config.enabled) {
        await screenshotProtection.enableProtection();
        setProtectionActive(true);
        
        // Show warning if enabled
        if (config.showWarning) {
          showPrivacyWarning();
        }
      }
    } catch (error) {
      console.warn('Failed to enable screenshot protection:', error);
    }
  };

  const disableScreenshotProtection = async () => {
    try {
      await screenshotProtection.disableProtection();
      setProtectionActive(false);
    } catch (error) {
      console.warn('Failed to disable screenshot protection:', error);
    }
  };

  const showPrivacyWarning = () => {
    const config = screenshotProtection.getConfig();
    if (config.showWarning) {
      Alert.alert(
        '🔒 Privacy Protection Active',
        'Screenshot protection is enabled for this conversation. ' +
        (Platform.OS === 'ios' 
          ? 'Note: On iOS, some screenshots may still be possible due to system limitations.'
          : 'Screenshots and screen recording are blocked.'),
        [
          { text: 'OK' },
          {
            text: 'Settings',
            onPress: () => navigation.navigate('PrivacySecurity' as never),
          },
        ]
      );
    }
  };

  const loadMessages = async () => {
    if (!chatId) return;
    
    setIsLoading(true);
    try {
      const chatMessages = await sonetMessagingApi.getMessages(chatId, 50, 0);
      setMessages(chatMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatId || !user) return;
    
    setIsSending(true);
    try {
      const messageData = {
        content: newMessage.trim(),
        senderId: user.id,
        recipientId: recipient.id,
        chatId: chatId,
        timestamp: new Date().toISOString(),
        type: 'text',
      };
      
      await sonetMessagingApi.sendMessage(messageData);
      setNewMessage('');
      
      // Reload messages to show the new one
      await loadMessages();
    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.senderId === user?.id;
    
    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage,
        { backgroundColor: isOwnMessage ? colors.primary : colors.surface }
      ]}>
        <Text style={[
          styles.messageText,
          { color: isOwnMessage ? colors.onPrimary : colors.onSurface }
        ]}>
          {item.content}
        </Text>
        <Text style={[
          styles.messageTime,
          { color: isOwnMessage ? colors.onPrimary + '80' : colors.onSurface + '80' }
        ]}>
          {new Date(item.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: colors.background }]}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      
      <View style={styles.headerInfo}>
        <Text style={[styles.recipientName, { color: colors.text }]}>
          {recipient?.displayName || recipient?.username || 'Unknown User'}
        </Text>
        <Text style={[styles.recipientStatus, { color: colors.textSecondary }]}>
          {recipient?.isOnline ? '🟢 Online' : '⚪ Offline'}
        </Text>
      </View>
      
      {/* Screenshot Protection Indicator */}
      {protectionActive && (
        <View style={[styles.protectionIndicator, { backgroundColor: colors.success + '20' }]}>
          <Ionicons name="shield-checkmark" size={16} color={colors.success} />
        </View>
      )}
    </View>
  );

  if (!recipient || !chatId) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            Invalid chat information
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {renderHeader()}
      
      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading messages...
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            inverted
            showsVerticalScrollIndicator={false}
          />
        )}
        
        <View style={[styles.inputContainer, { backgroundColor: colors.surface }]}>
          <TextInput
            style={[styles.textInput, { 
              color: colors.text,
              backgroundColor: colors.background,
              borderColor: colors.border 
            }]}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={1000}
          />
          
          <TouchableOpacity
            style={[
              styles.sendButton,
              { 
                backgroundColor: newMessage.trim() ? colors.primary : colors.disabled,
                opacity: newMessage.trim() && !isSending ? 1 : 0.6
              }
            ]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Ionicons name="send" size={20} color={colors.onPrimary} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerInfo: {
    flex: 1,
  },
  recipientName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  recipientStatus: {
    fontSize: 14,
  },
  protectionIndicator: {
    padding: 8,
    borderRadius: 20,
    marginLeft: 12,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  ownMessage: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 12,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    gap: 12,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
  },
});

export default DirectMessageScreen;