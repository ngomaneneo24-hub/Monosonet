import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import {Platform} from 'react-native'
import type {RealtimeMessage} from './realtime'

export interface PushNotificationData {
  messageId: string
  chatId: string
  senderId: string
  senderName: string
  content: string
  chatTitle: string
  type: 'message' | 'reaction' | 'typing' | 'online'
  timestamp: string
}

export interface PushNotificationSettings {
  enabled: boolean
  sound: boolean
  vibration: boolean
  showPreview: boolean
  quietHours: {
    enabled: boolean
    start: string // HH:mm format
    end: string // HH:mm format
  }
  chatSpecific: {
    [chatId: string]: {
      enabled: boolean
      sound: boolean
      vibration: boolean
      showPreview: boolean
    }
  }
}

export class SonetPushNotifications {
  private static instance: SonetPushNotifications
  private pushToken: string | null = null
  private notificationSettings: PushNotificationSettings
  private isInitialized = false

  private constructor() {
    this.notificationSettings = {
      enabled: true,
      sound: true,
      vibration: true,
      showPreview: true,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      },
      chatSpecific: {}
    }
  }

  static getInstance(): SonetPushNotifications {
    if (!SonetPushNotifications.instance) {
      SonetPushNotifications.instance = new SonetPushNotifications()
    }
    return SonetPushNotifications.instance
  }

  // Initialize push notifications
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Request permissions
      const {status: existingStatus} = await Notifications.getPermissionsAsync()
      let finalStatus = existingStatus

      if (existingStatus !== 'granted') {
        const {status} = await Notifications.requestPermissionsAsync()
        finalStatus = status
      }

      if (finalStatus !== 'granted') {
        console.warn('Push notification permissions not granted')
        this.notificationSettings.enabled = false
        return
      }

      // Get push token
      if (Device.isDevice) {
        const token = await Notifications.getExpoPushTokenAsync({
          projectId: process.env.EXPO_PROJECT_ID
        })
        this.pushToken = token.data
        // Debug logging removed for production
      }

      // Configure notification behavior
      await this.configureNotifications()

      // Set up notification usernamers
      this.setupNotificationUsernamers()

      this.isInitialized = true
      // Debug logging removed for production
    } catch (error) {
      console.error('Failed to initialize push notifications:', error)
      throw error
    }
  }

  // Configure notification behavior
  private async configureNotifications(): Promise<void> {
    await Notifications.setNotificationUsernamer({
      usernameNotification: async (notification) => {
        const data = notification.request.content.data as PushNotificationData
        
        // Check if notifications are enabled
        if (!this.notificationSettings.enabled) {
          return {
            shouldShowAlert: false,
            shouldPlaySound: false,
            shouldSetBadge: false
          }
        }

        // Check quiet hours
        if (this.isInQuietHours()) {
          return {
            shouldShowAlert: false,
            shouldPlaySound: false,
            shouldSetBadge: true // Still update badge
          }
        }

        // Check chat-specific settings
        const chatSettings = this.notificationSettings.chatSpecific[data.chatId]
        if (chatSettings && !chatSettings.enabled) {
          return {
            shouldShowAlert: false,
            shouldPlaySound: false,
            shouldSetBadge: true
          }
        }

        return {
          shouldShowAlert: this.notificationSettings.showPreview && 
            (!chatSettings || chatSettings.showPreview),
          shouldPlaySound: this.notificationSettings.sound && 
            (!chatSettings || chatSettings.sound),
          shouldSetBadge: true
        }
      }
    })
  }

  // Set up notification usernamers
  private setupNotificationUsernamers(): void {
    // Username notification received while app is in foreground
    Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as PushNotificationData
      // Debug logging removed for production
      
      // Emit event for app to username
      // This will be usernamed by the messaging service
    })

    // Username notification response (user tapped notification)
    Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as PushNotificationData
      // Debug logging removed for production
      
      // Navigate to the appropriate chat
      this.usernameNotificationResponse(data)
    })
  }

  // Username notification response
  private usernameNotificationResponse(data: PushNotificationData): void {
    // This will be implemented by the app to navigate to the chat
    // For now, we'll emit an event that the app can listen to
    const event = new CustomEvent('sonetNotificationResponse', {
      detail: data
    })
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(event)
    }
  }

  // Send local notification
  async sendLocalNotification(data: PushNotificationData): Promise<void> {
    try {
      if (!this.notificationSettings.enabled) return

      // Check quiet hours
      if (this.isInQuietHours()) return

      // Check chat-specific settings
      const chatSettings = this.notificationSettings.chatSpecific[data.chatId]
      if (chatSettings && !chatSettings.enabled) return

      const notificationContent = {
        title: data.chatTitle,
        body: this.formatNotificationBody(data),
        data: data,
        sound: this.shouldPlaySound(data.chatId),
        vibrate: this.shouldVibrate(data.chatId)
      }

      await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: null // Send immediately
      })

      // Debug logging removed for production
    } catch (error) {
      console.error('Failed to send local notification:', error)
    }
  }

  // Format notification body
  private formatNotificationBody(data: PushNotificationData): string {
    if (!this.notificationSettings.showPreview) {
      return 'New message'
    }

    const chatSettings = this.notificationSettings.chatSpecific[data.chatId]
    if (chatSettings && !chatSettings.showPreview) {
      return 'New message'
    }

    switch (data.type) {
      case 'message':
        return `${data.senderName}: ${data.content}`
      case 'reaction':
        return `${data.senderName} reacted to a message`
      case 'typing':
        return `${data.senderName} is typing...`
      case 'online':
        return `${data.senderName} is online`
      default:
        return 'New activity'
    }
  }

  // Check if current time is in quiet hours
  private isInQuietHours(): boolean {
    if (!this.notificationSettings.quietHours.enabled) return false

    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()
    
    const [startHour, startMinute] = this.notificationSettings.quietHours.start.split(':').map(Number)
    const [endHour, endMinute] = this.notificationSettings.quietHours.end.split(':').map(Number)
    
    const startTime = startHour * 60 + startMinute
    const endTime = endHour * 60 + endMinute
    
    if (startTime <= endTime) {
      // Same day (e.g., 08:00 to 22:00)
      return currentTime >= startTime && currentTime <= endTime
    } else {
      // Overnight (e.g., 22:00 to 08:00)
      return currentTime >= startTime || currentTime <= endTime
    }
  }

  // Check if sound should play for a specific chat
  private shouldPlaySound(chatId: string): boolean {
    if (!this.notificationSettings.sound) return false
    
    const chatSettings = this.notificationSettings.chatSpecific[chatId]
    if (chatSettings) {
      return chatSettings.sound
    }
    
    return this.notificationSettings.sound
  }

  // Check if vibration should occur for a specific chat
  private shouldVibrate(chatId: string): boolean {
    if (!this.notificationSettings.vibration) return false
    
    const chatSettings = this.notificationSettings.chatSpecific[chatId]
    if (chatSettings) {
      return chatSettings.vibration
    }
    
    return this.notificationSettings.vibration
  }

  // Update notification settings
  async updateSettings(settings: Partial<PushNotificationSettings>): Promise<void> {
    this.notificationSettings = {
      ...this.notificationSettings,
      ...settings
    }

    // Save settings to storage
    await this.saveSettings()
  }

  // Update chat-specific settings
  async updateChatSettings(chatId: string, settings: Partial<PushNotificationSettings['chatSpecific'][string]>): Promise<void> {
    this.notificationSettings.chatSpecific[chatId] = {
      ...this.notificationSettings.chatSpecific[chatId],
      ...settings
    }

    await this.saveSettings()
  }

  // Save settings to storage
  private async saveSettings(): Promise<void> {
    try {
      // This would typically save to AsyncStorage or similar
      // For now, we'll just log the settings
      // Debug logging removed for production
    } catch (error) {
      console.error('Failed to save notification settings:', error)
    }
  }

  // Get current settings
  getSettings(): PushNotificationSettings {
    return {...this.notificationSettings}
  }

  // Get push token
  getPushToken(): string | null {
    return this.pushToken
  }

  // Check if notifications are enabled
  areNotificationsEnabled(): boolean {
    return this.notificationSettings.enabled
  }

  // Check if app is in foreground
  isAppInForeground(): boolean {
    // This would typically check the app state
    // For now, we'll assume it's always in foreground
    return true
  }

  // Schedule notification for later
  async scheduleNotification(data: PushNotificationData, trigger: any): Promise<string> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: data.chatTitle,
          body: this.formatNotificationBody(data),
          data: data
        },
        trigger
      })

      return notificationId
    } catch (error) {
      console.error('Failed to schedule notification:', error)
      throw error
    }
  }

  // Cancel scheduled notification
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId)
    } catch (error) {
      console.error('Failed to cancel notification:', error)
    }
  }

  // Cancel all scheduled notifications
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync()
    } catch (error) {
      console.error('Failed to cancel all notifications:', error)
    }
  }

  // Get notification history
  async getNotificationHistory(): Promise<any[]> {
    try {
      return await Notifications.getPresentedNotificationsAsync()
    } catch (error) {
      console.error('Failed to get notification history:', error)
      return []
    }
  }

  // Set badge count
  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count)
    } catch (error) {
      console.error('Failed to set badge count:', error)
    }
  }

  // Get badge count
  async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync()
    } catch (error) {
      console.error('Failed to get badge count:', error)
      return 0
    }
  }
}