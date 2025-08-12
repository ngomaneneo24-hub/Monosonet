import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity
} from 'react-native'

interface VideoFeedErrorProps {
  error: any
  onRetry: () => void
}

export const VideoFeedError: React.FC<VideoFeedErrorProps> = ({
  error,
  onRetry
}) => {
  const getErrorMessage = (error: any): string => {
    if (error?.message) {
      return error.message
    }
    if (error?.error) {
      return error.error
    }
    return 'Something went wrong while loading videos'
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>⚠️</Text>
      </View>
      
      <Text style={styles.title}>Oops! Something went wrong</Text>
      
      <Text style={styles.description}>
        {getErrorMessage(error)}
      </Text>
      
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.helpButton}>
        <Text style={styles.helpButtonText}>Get Help</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#FFFFFF',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF3CD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginBottom: 16,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  helpButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  helpButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
})