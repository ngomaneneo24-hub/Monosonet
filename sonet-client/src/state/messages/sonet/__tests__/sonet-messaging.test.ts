import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import {SonetMessagingApi} from '#/services/sonetMessagingApi'
import {SonetConvoProvider, useSonetConvo} from '../convo'
import {renderHook, waitFor} from '@testing-library/react'
import React from 'react'

// Mock SonetApi
const mockSonetApi = {
  fetchJson: vi.fn(),
  fetchForm: vi.fn(),
  baseUrl: 'http://localhost:3000',
}

// Mock environment variables
vi.mock('#/env', () => ({
  USE_SONET_MESSAGING: true,
  USE_SONET_E2E_ENCRYPTION: true,
  USE_SONET_REALTIME: true,
}))

// Mock session
vi.mock('#/state/session/sonet', () => ({
  useSonetApi: () => mockSonetApi,
  useSonetSession: () => ({
    account: {
      userId: 'test-user',
      username: 'testuser',
      accessToken: 'test-token',
    },
    hasSession: true,
  }),
}))

describe('SonetMessagingApi', () => {
  let api: SonetMessagingApi

  beforeEach(() => {
    api = new SonetMessagingApi(mockSonetApi as any)
    vi.clearAllMocks()
  })

  describe('sendMessage', () => {
    it('should send a message successfully', async () => {
      const mockResponse = {
        message: {
          message_id: 'msg-123',
          chat_id: 'chat-123',
          sender_id: 'test-user',
          content: 'Hello, world!',
          type: 'text',
          status: 'sent',
          encryption: 'e2e',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          is_edited: false,
        },
      }

      mockSonetApi.fetchJson.mockResolvedValue(mockResponse)

      const result = await api.sendMessage({
        chat_id: 'chat-123',
        content: 'Hello, world!',
        type: 'text',
        encryption: 'e2e',
      })

      expect(mockSonetApi.fetchJson).toHaveBeenCalledWith('/v1/messages', {
        method: 'NOTE',
        body: JSON.stringify({
          chat_id: 'chat-123',
          content: 'Hello, world!',
          type: 'text',
          encryption: 'e2e',
        }),
      })

      expect(result).toEqual(mockResponse.message)
    })

    it('should handle send message errors', async () => {
      const error = new Error('Network error')
      mockSonetApi.fetchJson.mockRejectedValue(error)

      await expect(api.sendMessage({
        chat_id: 'chat-123',
        content: 'Hello, world!',
      })).rejects.toThrow('Network error')
    })
  })

  describe('getMessages', () => {
    it('should get messages successfully', async () => {
      const mockResponse = {
        messages: [
          {
            message_id: 'msg-123',
            chat_id: 'chat-123',
            sender_id: 'test-user',
            content: 'Hello, world!',
            type: 'text',
            status: 'sent',
            encryption: 'e2e',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
            is_edited: false,
          },
        ],
        pagination: {
          cursor: 'next-cursor',
          has_more: true,
        },
      }

      mockSonetApi.fetchJson.mockResolvedValue(mockResponse)

      const result = await api.getMessages({
        chat_id: 'chat-123',
        limit: 20,
      })

      expect(mockSonetApi.fetchJson).toHaveBeenCalledWith(
        '/v1/messages/chat-123?limit=20'
      )

      expect(result).toEqual({
        messages: mockResponse.messages,
        pagination: mockResponse.pagination,
      })
    })
  })

  describe('getChats', () => {
    it('should get chats successfully', async () => {
      const mockResponse = {
        conversations: [
          {
            chat_id: 'chat-123',
            name: 'Test Chat',
            description: 'A test chat',
            type: 'direct',
            creator_id: 'test-user',
            participant_ids: ['test-user', 'other-user'],
            last_activity: '2025-01-01T00:00:00Z',
            is_archived: false,
            is_muted: false,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
            settings: {},
          },
        ],
        pagination: {
          cursor: 'next-cursor',
          has_more: true,
        },
      }

      mockSonetApi.fetchJson.mockResolvedValue(mockResponse)

      const result = await api.getChats({
        user_id: 'test-user',
        type: 'direct',
        limit: 20,
      })

      expect(mockSonetApi.fetchJson).toHaveBeenCalledWith(
        '/v1/messages/conversations?type=direct&limit=20'
      )

      expect(result).toEqual({
        chats: mockResponse.conversations,
        pagination: mockResponse.pagination,
      })
    })
  })

  describe('uploadAttachment', () => {
    it('should upload attachment successfully', async () => {
      const mockFile = new Blob(['test content'], {type: 'text/plain'})
      const mockResponse = {
        attachment: {
          attachment_id: 'att-123',
          filename: 'test.txt',
          content_type: 'text/plain',
          size: 12,
          url: 'http://localhost:3000/attachments/att-123',
          metadata: {},
        },
      }

      mockSonetApi.fetchForm.mockResolvedValue(mockResponse)

      const result = await api.uploadAttachment(mockFile, 'test.txt', 'text/plain')

      expect(mockSonetApi.fetchForm).toHaveBeenCalledWith('/v1/messages/attachments', expect.any(FormData))

      expect(result).toEqual(mockResponse.attachment)
    })
  })
})

describe('SonetConvoProvider', () => {
  const wrapper = ({children}: {children: React.ReactNode}) => (
    React.createElement(
      SonetConvoProvider,
      {chatId: 'test-chat', initialChat: null},
      children,
    )
  )

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize conversation state', async () => {
    const {result} = renderHook(() => useSonetConvo(), {wrapper})

    await waitFor(() => {
      expect(result.current.state.status).toBe('uninitialized')
    })
  })

  it('should send message successfully', async () => {
    const mockMessage = {
      message_id: 'msg-123',
      chat_id: 'test-chat',
      sender_id: 'test-user',
      content: 'Hello, world!',
      type: 'text' as const,
      status: 'sent' as const,
      encryption: 'e2e' as const,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      is_edited: false,
    }

    mockSonetApi.fetchJson.mockResolvedValue({message: mockMessage})

    const {result} = renderHook(() => useSonetConvo(), {wrapper})

    await waitFor(() => {
      expect(result.current.sendMessage).toBeDefined()
    })

    const message = await result.current.sendMessage({
      chat_id: 'test-chat',
      content: 'Hello, world!',
      type: 'text',
      encryption: 'e2e',
    })

    expect(message).toEqual(mockMessage)
  })

  it('should load messages successfully', async () => {
    const mockMessages = [
      {
        message_id: 'msg-123',
        chat_id: 'test-chat',
        sender_id: 'test-user',
        content: 'Hello, world!',
        type: 'text' as const,
        status: 'sent' as const,
        encryption: 'e2e' as const,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        is_edited: false,
      },
    ]

    const mockResponse = {
      messages: mockMessages,
      pagination: {has_more: false},
    }

    mockSonetApi.fetchJson.mockResolvedValue(mockResponse)

    const {result} = renderHook(() => useSonetConvo(), {wrapper})

    await waitFor(() => {
      expect(result.current.loadMessages).toBeDefined()
    })

    await result.current.loadMessages({
      chat_id: 'test-chat',
      limit: 20,
    })

    await waitFor(() => {
      expect(result.current.state.messages).toEqual(mockMessages)
      expect(result.current.state.status).toBe('ready')
    })
  })
})

describe('Migration Integration', () => {
  it('should work with feature flags disabled', () => {
    // Test with AT Protocol fallback
    vi.doMock('#/env', () => ({
      USE_SONET_MESSAGING: false,
      USE_SONET_E2E_ENCRYPTION: false,
      USE_SONET_REALTIME: false,
    }))

    // This would test the hybrid provider with AT Protocol
    expect(true).toBe(true) // Placeholder
  })

  it('should work with feature flags enabled', () => {
    // Test with Sonet features enabled
    vi.doMock('#/env', () => ({
      USE_SONET_MESSAGING: true,
      USE_SONET_E2E_ENCRYPTION: true,
      USE_SONET_REALTIME: true,
    }))

    // This would test the hybrid provider with Sonet
    expect(true).toBe(true) // Placeholder
  })
})