import React, {useState, useEffect} from 'react'
import {View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert} from 'react-native'
import {SonetConvoProvider, useSonetConvo} from '#/state/messages/sonet'
import {sonetMessagingApi} from '#/services/sonetMessagingApi'
import {sonetWebSocket} from '#/services/sonetWebSocket'

// Test component for Sonet messaging
function SonetMessagingTestInner({chatId}: {chatId: string}) {
  const {state, actions} = useSonetConvo()
  const [messageText, setMessageText] = useState('')
  const [isConnected, setIsConnected] = useState(false)

  // Test connection status
  useEffect(() => {
    const checkConnection = () => {
      const connected = sonetWebSocket.isConnected()
      setIsConnected(connected)
    }

    checkConnection()
    const interval = setInterval(checkConnection, 2000)
    return () => clearInterval(interval)
  }, [])

  // Test sending message
  const usernameSendMessage = async () => {
    if (!messageText.trim()) return

    try {
      await actions.sendMessage({
        content: messageText.trim(),
        encrypt: state.chat?.isEncrypted || false
      })
      setMessageText('')
    } catch (error) {
      Alert.alert('Error', `Failed to send message: ${error}`)
    }
  }

  // Test loading messages
  const usernameLoadMessages = async () => {
    try {
      await actions.loadMessages({refresh: true})
    } catch (error) {
      Alert.alert('Error', `Failed to load messages: ${error}`)
    }
  }

  // Test encryption toggle
  const usernameToggleEncryption = async () => {
    try {
      if (state.encryptionStatus === 'enabled') {
        await actions.disableEncryption()
      } else {
        await actions.enableEncryption()
      }
    } catch (error) {
      Alert.alert('Error', `Failed to toggle encryption: ${error}`)
    }
  }

  // Test typing indicator
  const usernameTyping = async (isTyping: boolean) => {
    try {
      await actions.setTyping(isTyping)
    } catch (error) {
      Alert.alert('Error', `Failed to set typing: ${error}`)
    }
  }

  return (
    <View style={styles.container}>
      {/* Connection Status */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          Status: {state.status}
        </Text>
        <Text style={[styles.connectionText, {color: isConnected ? 'green' : 'red'}]}>
          {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </Text>
        <Text style={styles.encryptionText}>
          Encryption: {state.encryptionStatus}
        </Text>
      </View>

      {/* Chat Info */}
      {state.chat && (
        <View style={styles.chatInfo}>
          <Text style={styles.chatName}>{state.chat.name}</Text>
          <Text style={styles.chatType}>{state.chat.type} chat</Text>
          <Text style={styles.participantCount}>
            {state.chat.participants.length} participants
          </Text>
        </View>
      )}

      {/* Messages */}
      <ScrollView style={styles.messagesContainer}>
        {state.messages.length === 0 ? (
          <Text style={styles.noMessages}>No messages yet</Text>
        ) : (
          state.messages.map((message) => (
            <View key={message.id} style={styles.messageItem}>
              <Text style={styles.messageSender}>
                {message.senderId === 'current_user' ? 'You' : message.senderId}
              </Text>
              <Text style={styles.messageContent}>{message.content}</Text>
              <Text style={styles.messageTime}>
                {new Date(message.timestamp).toLocaleTimeString()}
              </Text>
              <Text style={styles.messageStatus}>
                Status: {message.status}
                {message.isEncrypted && ' 🔒'}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Typing Indicators */}
      {state.typingUsers.size > 0 && (
        <View style={styles.typingContainer}>
          <Text style={styles.typingText}>
            {Array.from(state.typingUsers).join(', ')} is typing...
          </Text>
        </View>
      )}

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={messageText}
          onChangeText={setMessageText}
          placeholder="Type a message..."
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={usernameSendMessage}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>

      {/* Test Controls */}
      <View style={styles.testControls}>
        <TouchableOpacity style={styles.testButton} onPress={usernameLoadMessages}>
          <Text style={styles.testButtonText}>Refresh Messages</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.testButton} onPress={usernameToggleEncryption}>
          <Text style={styles.testButtonText}>
            {state.encryptionStatus === 'enabled' ? 'Disable' : 'Enable'} Encryption
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.testButton} 
          onPress={() => usernameTyping(true)}
          onPressOut={() => usernameTyping(false)}
        >
          <Text style={styles.testButtonText}>Hold to Type</Text>
        </TouchableOpacity>
      </View>

      {/* Debug Info */}
      <View style={styles.debugInfo}>
        <Text style={styles.debugText}>Messages: {state.messages.length}</Text>
        <Text style={styles.debugText}>Unread: {state.unreadCount}</Text>
        <Text style={styles.debugText}>Has More: {state.hasMore ? 'Yes' : 'No'}</Text>
        <Text style={styles.debugText}>Loading: {state.isLoading ? 'Yes' : 'No'}</Text>
        <Text style={styles.debugText}>Loading More: {state.isLoadingMore ? 'Yes' : 'No'}</Text>
      </View>
    </View>
  )
}

// Wrapper component with provider
export function SonetMessagingTest({chatId}: {chatId: string}) {
  return (
    <SonetConvoProvider chatId={chatId}>
      <SonetMessagingTestInner chatId={chatId} />
    </SonetConvoProvider>
  )
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  connectionText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  encryptionText: {
    fontSize: 12,
    color: '#666',
  },
  chatInfo: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  chatName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  chatType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  participantCount: {
    fontSize: 12,
    color: '#999',
  },
  messagesContainer: {
    flex: 1,
    padding: 10,
  },
  noMessages: {
    textAlign: 'center',
    color: '#999',
    marginTop: 50,
  },
  messageItem: {
    backgroundColor: '#fff',
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  messageSender: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  messageContent: {
    fontSize: 16,
    marginBottom: 5,
  },
  messageTime: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
  messageStatus: {
    fontSize: 12,
    color: '#666',
  },
  typingContainer: {
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  typingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  testControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  testButton: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 8,
    margin: 5,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  debugInfo: {
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
})