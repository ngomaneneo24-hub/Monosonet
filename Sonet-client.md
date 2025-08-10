# Sonet Frontend Implementation Guide

> **Complete guide for cloning Bluesky Social app and adapting it for Sonet C++ backend**

## 🎯 Overview

Transform the Bluesky Social app into Sonet's frontend by adapting the AT Protocol calls to work with Sonet C++ microservices backend.

## 📋 Prerequisites

- **Node.js** 18+ and **npm/yarn**
- **React Native CLI** (for mobile)
- **Expo CLI** (optional, for easier mobile development)
- **Git** for version control
- The **Sonet C++ backend** running locally

## 🚀 Phase 1: Project Setup

### Step 1: Clone and Rebrand

```bash
# Clone Bluesky Social app
git clone https://github.com/bluesky-social/social-app.git sonet-app
cd sonet-app

# Create new git repository
rm -rf .git
git init
git remote add origin YOUR_SONET_FRONTEND_REPO

# Install dependencies
npm install
# or
yarn install
```

### Step 2: Global Rebranding

```bash
# Replace all instances of "Bluesky" with "Sonet"
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  -not -path "./node_modules/*" \
  -exec sed -i 's/Bluesky/Sonet/g' {} +

# Replace all instances of "Post", "Repost", etc with "Note", "Renote", etc

# Replace package.json references
find . -name "package.json" -not -path "./node_modules/*" \
  -exec sed -i 's/bluesky/sonet/g' {} +

# Update app.json and other config files
sed -i 's/bluesky/sonet/g' app.json
sed -i 's/Bluesky/Sonet/g' app.json
```

### Step 3: Update App Configuration

```json
// app.json
{
  "expo": {
    "name": "Sonet",
    "slug": "sonet",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.sonet.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FFFFFF"
      },
      "package": "com.sonet.app"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    }
  }
}
```

## 🔧 Phase 2: API Client Architecture

### Step 1: Create Sonet API Client

```typescript
// src/lib/api/sonet-client.ts
import axios, { AxiosInstance } from 'axios';

export interface SonetConfig {
  baseURL: string;
  timeout?: number;
  apiKey?: string;
}

export class SonetApiClient {
  private client: AxiosInstance;
  private authToken?: string;

  constructor(config: SonetConfig) {
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for auth token
    this.client.interceptors.request.use((config) => {
      if (this.authToken) {
        config.headers.Authorization = `Bearer ${this.authToken}`;
      }
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle token expiration
          this.clearAuth();
        }
        return Promise.reject(error);
      }
    );
  }

  setAuthToken(token: string) {
    this.authToken = token;
  }

  clearAuth() {
    this.authToken = undefined;
  }

  // User Service API calls
  async login(email: string, password: string) {
    const response = await this.client.post('/api/v1/auth/login', {
      email,
      password,
    });
    return response.data;
  }

  async register(username: string, email: string, password: string) {
    const response = await this.client.post('/api/v1/auth/register', {
      username,
      email,
      password,
    });
    return response.data;
  }

  async getProfile(userId?: string) {
    const endpoint = userId ? `/api/v1/users/${userId}` : '/api/v1/users/me';
    const response = await this.client.get(endpoint);
    return response.data;
  }

  async updateProfile(profileData: Partial<SonetUser>) {
    const response = await this.client.put('/api/v1/users/me', profileData);
    return response.data;
  }

  // Timeline Service API calls
  async getHomeFeed(limit = 20, cursor?: string) {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (cursor) params.append('cursor', cursor);
    
    const response = await this.client.get(`/api/v1/timeline/home?${params}`);
    return response.data;
  }

  async getUserFeed(userId: string, limit = 20, cursor?: string) {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (cursor) params.append('cursor', cursor);
    
    const response = await this.client.get(`/api/v1/timeline/user/${userId}?${params}`);
    return response.data;
  }

  // Note Service API calls
  async createNote(content: string, mediaIds?: string[], replyTo?: string) {
    const response = await this.client.post('/api/v1/notes', {
      content,
      media_ids: mediaIds,
      reply_to: replyTo,
    });
    return response.data;
  }

  async getNote(noteId: string) {
    const response = await this.client.get(`/api/v1/notes/${noteId}`);
    return response.data;
  }

  async deleteNote(noteId: string) {
    const response = await this.client.delete(`/api/v1/notes/${noteId}`);
    return response.data;
  }

  async likeNote(noteId: string) {
    const response = await this.client.post(`/api/v1/notes/${noteId}/like`);
    return response.data;
  }

  async unlikeNote(noteId: string) {
    const response = await this.client.delete(`/api/v1/notes/${noteId}/like`);
    return response.data;
  }

  async shareNote(noteId: string) {
    const response = await this.client.post(`/api/v1/notes/${noteId}/share`);
    return response.data;
  }

  // Follow Service API calls
  async followUser(userId: string) {
    const response = await this.client.post(`/api/v1/follow/${userId}`);
    return response.data;
  }

  async unfollowUser(userId: string) {
    const response = await this.client.delete(`/api/v1/follow/${userId}`);
    return response.data;
  }

  async getFollowers(userId: string, limit = 20, cursor?: string) {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (cursor) params.append('cursor', cursor);
    
    const response = await this.client.get(`/api/v1/users/${userId}/followers?${params}`);
    return response.data;
  }

  async getFollowing(userId: string, limit = 20, cursor?: string) {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (cursor) params.append('cursor', cursor);
    
    const response = await this.client.get(`/api/v1/users/${userId}/following?${params}`);
    return response.data;
  }

  // Search Service API calls
  async searchNotes(query: string, limit = 20, cursor?: string) {
    const params = new URLSearchParams({ 
      q: query, 
      type: 'notes',
      limit: limit.toString() 
    });
    if (cursor) params.append('cursor', cursor);
    
    const response = await this.client.get(`/api/v1/search?${params}`);
    return response.data;
  }

  async searchUsers(query: string, limit = 20, cursor?: string) {
    const params = new URLSearchParams({ 
      q: query, 
      type: 'users',
      limit: limit.toString() 
    });
    if (cursor) params.append('cursor', cursor);
    
    const response = await this.client.get(`/api/v1/search?${params}`);
    return response.data;
  }

  // Media Service API calls
  async uploadMedia(file: File | Blob) {
    const formData = new FormData();
    formData.append('media', file);
    
    const response = await this.client.post('/api/v1/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Messaging Service API calls
  async getConversations() {
    const response = await this.client.get('/api/v1/messages/conversations');
    return response.data;
  }

  async getMessages(conversationId: string, limit = 20, cursor?: string) {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (cursor) params.append('cursor', cursor);
    
    const response = await this.client.get(`/api/v1/messages/${conversationId}?${params}`);
    return response.data;
  }

  async sendMessage(recipientId: string, content: string, mediaIds?: string[]) {
    const response = await this.client.post('/api/v1/messages', {
      recipient_id: recipientId,
      content,
      media_ids: mediaIds,
    });
    return response.data;
  }

  // Note to Self feature
  async getNoteToSelf() {
    const response = await this.client.get('/api/v1/messages/note-to-self');
    return response.data;
  }

  async addNoteToSelf(content: string, mediaIds?: string[]) {
    const response = await this.client.post('/api/v1/messages/note-to-self', {
      content,
      media_ids: mediaIds,
    });
    return response.data;
  }

  async postFromNoteToSelf(noteToSelfId: string) {
    const response = await this.client.post(`/api/v1/messages/note-to-self/${noteToSelfId}/post`);
    return response.data;
  }

  // Notification Service API calls
  async getNotifications(limit = 20, cursor?: string) {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (cursor) params.append('cursor', cursor);
    
    const response = await this.client.get(`/api/v1/notifications?${params}`);
    return response.data;
  }

  async markNotificationRead(notificationId: string) {
    const response = await this.client.put(`/api/v1/notifications/${notificationId}/read`);
    return response.data;
  }
}
```

### Step 2: Data Type Definitions

```typescript
// src/lib/api/types.ts
export interface SonetUser {
  id: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
  follower_count: number;
  following_count: number;
  note_count: number;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface SonetNote {
  id: string;
  content: string;
  author: SonetUser;
  created_at: string;
  updated_at: string;
  reply_to?: string;
  thread_root?: string;
  metrics: {
    likes: number;
    replies: number;
    shares: number;
    views?: number;
  };
  media?: MediaItem[];
  user_interactions: {
    liked: boolean;
    shared: boolean;
  };
}

export interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'gif';
  url: string;
  thumbnail_url?: string;
  width?: number;
  height?: number;
  alt_text?: string;
}

export interface SonetConversation {
  id: string;
  type: 'direct_message' | 'group_chat' | 'note_to_self';
  participants: SonetUser[];
  last_message?: SonetMessage;
  unread_count: number;
  updated_at: string;
}

export interface SonetMessage {
  id: string;
  conversation_id: string;
  sender: SonetUser;
  content: string;
  media?: MediaItem[];
  created_at: string;
  read: boolean;
  message_type: 'text' | 'media' | 'system';
}

export interface SonetNotification {
  id: string;
  type: 'like' | 'reply' | 'follow' | 'mention' | 'share';
  actor: SonetUser;
  target_note?: SonetNote;
  message: string;
  read: boolean;
  created_at: string;
}

export interface SonetFeedResponse {
  notes: SonetNote[];
  cursor?: string;
  has_more: boolean;
}

export interface SonetAuthResponse {
  user: SonetUser;
  token: string;
  expires_at: string;
}
```

### Step 3: API Client Configuration

```typescript
// src/lib/api/config.ts
export const API_CONFIG = {
  development: {
    baseURL: 'http://localhost:8080',
    timeout: 10000,
  },
  production: {
    baseURL: 'https://api.sonet.app',
    timeout: 15000,
  },
  staging: {
    baseURL: 'https://staging-api.sonet.app',
    timeout: 10000,
  },
};

export const getApiConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  return API_CONFIG[env as keyof typeof API_CONFIG] || API_CONFIG.development;
};
```

## 🎨 Phase 3: Screen Adaptations

### Step 1: Update Main Screens

```typescript
// src/view/screens/Home.tsx
import React, { useState, useEffect } from 'react';
import { SonetApiClient } from '../../lib/api/sonet-client';
import { SonetNote, SonetFeedResponse } from '../../lib/api/types';

export const HomeScreen = () => {
  const [feed, setFeed] = useState<SonetNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const apiClient = new SonetApiClient(getApiConfig());

  const loadHomeFeed = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);

      const response: SonetFeedResponse = await apiClient.getHomeFeed(20);
      setFeed(refresh ? response.notes : [...feed, ...response.notes]);
    } catch (error) {
      console.error('Failed to load home feed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadHomeFeed();
  }, []);

  // Rest of component implementation...
};
```

### Step 2: Authentication Flow

```typescript
// src/view/screens/Login.tsx
import React, { useState } from 'react';
import { SonetApiClient } from '../../lib/api/sonet-client';
import { SonetAuthResponse } from '../../lib/api/types';

export const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const apiClient = new SonetApiClient(getApiConfig());

  const handleLogin = async () => {
    try {
      setLoading(true);
      const response: SonetAuthResponse = await apiClient.login(email, password);
      
      // Store auth token
      await AsyncStorage.setItem('auth_token', response.token);
      await AsyncStorage.setItem('user_data', JSON.stringify(response.user));
      
      // Set token in API client
      apiClient.setAuthToken(response.token);
      
      // Navigate to main app
      navigation.navigate('Home');
    } catch (error) {
      console.error('Login failed:', error);
      // Show error message
    } finally {
      setLoading(false);
    }
  };

  // Rest of component implementation...
};
```

## 🔄 Phase 4: Real-time Features

### WebSocket Integration

```typescript
// src/lib/websocket/sonet-websocket.ts
export class SonetWebSocket {
  private ws?: WebSocket;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(url: string) {
    this.url = url;
  }

  connect(authToken: string) {
    this.ws = new WebSocket(`${this.url}?token=${authToken}`);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.attemptReconnect(authToken);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private handleMessage(data: any) {
    switch (data.type) {
      case 'new_note':
        // Handle new note in timeline
        break;
      case 'new_message':
        // Handle new direct message
        break;
      case 'notification':
        // Handle new notification
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  private attemptReconnect(authToken: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.connect(authToken);
      }, 2000 * this.reconnectAttempts);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
  }
}
```

## 🎯 Phase 5: Deployment Configuration

### Step 1: Environment Configuration

```bash
# .env.development
SONET_API_BASE_URL=http://localhost:8080
SONET_WS_URL=ws://localhost:8080/ws
SONET_APP_NAME=Sonet
SONET_ENVIRONMENT=development

# .env.production
SONET_API_BASE_URL=https://api.sonet.app
SONET_WS_URL=wss://api.sonet.app/ws
SONET_APP_NAME=Sonet
SONET_ENVIRONMENT=production
```

### Step 2: Build Scripts

```json
// package.json scripts
{
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "web": "expo start --web",
    "build:android": "eas build --platform android",
    "build:ios": "eas build --platform ios",
    "build:web": "expo export --platform web",
    "lint": "eslint . --ext .ts,.tsx",
    "type-check": "tsc --noEmit"
  }
}
```

## 🧪 Phase 6: Testing Integration

### API Client Tests

```typescript
// src/lib/api/__tests__/sonet-client.test.ts
import { SonetApiClient } from '../sonet-client';

describe('SonetApiClient', () => {
  let client: SonetApiClient;

  beforeEach(() => {
    client = new SonetApiClient({
      baseURL: 'http://localhost:8080',
      timeout: 5000,
    });
  });

  test('should login successfully', async () => {
    // Mock successful login
    const mockResponse = {
      user: { id: '1', username: 'testuser' },
      token: 'mock-jwt-token',
      expires_at: '2024-12-31T23:59:59Z',
    };

    // Test implementation
  });

  test('should get home feed', async () => {
    // Test implementation
  });

  // Add more tests...
});
```

## 🚀 Phase 7: Launch Checklist

### Pre-Launch Tasks

- [ ] **API Integration Complete**
  - [ ] All endpoints mapped from Bluesky to Sonet
  - [ ] Authentication flow working
  - [ ] Real-time features implemented
  
- [ ] **UI/UX Updates**
  - [ ] Branding updated (colors, logos, names)
  - [ ] Custom features implemented (Note to Self)
  - [ ] Error handling for your API responses
  
- [ ] **Testing Complete**
  - [ ] API client unit tests
  - [ ] Integration tests with backend
  - [ ] End-to-end user flow tests
  
- [ ] **Performance Optimization**
  - [ ] Image lazy loading
  - [ ] Infinite scroll optimization
  - [ ] Network request caching
  
- [ ] **Security**
  - [ ] JWT token handling
  - [ ] Secure storage for sensitive data
  - [ ] API request signing (if needed)

### Deployment

- [ ] **Mobile Apps**
  - [ ] iOS App Store submission
  - [ ] Google Play Store submission
  - [ ] App screenshots and descriptions
  
- [ ] **Web App**
  - [ ] Build and deploy to CDN
  - [ ] Progressive Web App features
  - [ ] SEO optimization

## 🎉 Success Metrics

After successful deployment, monitor:

- **User Authentication**: Login/register success rates
- **API Performance**: Response times for all endpoints  
- **Real-time Features**: WebSocket connection stability
- **User Engagement**: Time spent in app, feature usage
- **Error Rates**: Client-side error tracking

---

## 📞 Support & Resources

- **Bluesky Social App Repo**: [GitHub](https://github.com/bluesky-social/social-app)
- **React Native Documentation**: [reactnative.dev](https://reactnative.dev)
- **Expo Documentation**: [docs.expo.dev](https://docs.expo.dev)
- **Your Sonet Backend API**: `http://localhost:8080/api/docs` (if you add API docs)

---

**🎯 Goal**: Transform Bluesky's proven social media UI into Sonet's frontend, powered by your bulletproof C++ backend!

**🚀 Timeline**: Plan for 2-4 weeks of focused frontend development to get a fully functional social media app.
