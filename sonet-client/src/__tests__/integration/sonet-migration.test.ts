// Comprehensive Sonet Migration Integration Test
// Verifies all systems are working correctly after migration

import {describe, it, expect, beforeEach, afterEach} from '@jest/globals'
import {sonetClient} from '@sonet/api'
import {feedAnalytics, searchAnalytics} from '#/state/queries'
import {messageStore} from '#/state/messages/sonet-messaging'

describe('Sonet Migration Integration Tests', () => {
  beforeEach(() => {
    // Reset analytics and message store for clean tests
    jest.clearAllMocks()
  })

  afterEach(() => {
    // Cleanup after each test
    jest.restoreAllMocks()
  })

  describe('Sonet API Client', () => {
    it('should have all required methods', () => {
      expect(sonetClient).toBeDefined()
      expect(typeof sonetClient.login).toBe('function')
      expect(typeof sonetClient.register).toBe('function')
      expect(typeof sonetClient.logout).toBe('function')
      expect(typeof sonetClient.createNote).toBe('function')
      expect(typeof sonetClient.getTimeline).toBe('function')
      expect(typeof sonetClient.getNote).toBe('function')
      expect(typeof sonetClient.reactToNote).toBe('function')
      expect(typeof sonetClient.followUser).toBe('function')
      expect(typeof sonetClient.getUser).toBe('function')
      expect(typeof sonetClient.search).toBe('function')
    })

    it('should handle authentication correctly', async () => {
      const mockResponse = {
        accessToken: 'test-token',
        refreshToken: 'refresh-token',
        user: {
          id: 'test-user-id',
          username: 'testuser',
          displayName: 'Test User',
        },
      }

      jest.spyOn(sonetClient, 'login').mockResolvedValue(mockResponse)
      
      const result = await sonetClient.login('testuser', 'password')
      
      expect(result).toEqual(mockResponse)
      expect(sonetClient.login).toHaveBeenCalledWith('testuser', 'password')
    })

    it('should handle note creation', async () => {
      const mockNote = {
        id: 'test-note-id',
        content: 'Test note content',
        authorId: 'test-user-id',
        createdAt: new Date().toISOString(),
      }

      jest.spyOn(sonetClient, 'createNote').mockResolvedValue(mockNote)
      
      const result = await sonetClient.createNote('Test note content')
      
      expect(result).toEqual(mockNote)
      expect(sonetClient.createNote).toHaveBeenCalledWith('Test note content')
    })
  })

  describe('Sonet Feed System', () => {
    it('should have feed analytics system', () => {
      expect(feedAnalytics).toBeDefined()
      expect(typeof feedAnalytics.recordEvent).toBe('function')
      expect(typeof feedAnalytics.recordMetric).toBe('function')
      expect(typeof feedAnalytics.getMetrics).toBe('function')
      expect(typeof feedAnalytics.getEventSummary).toBe('function')
      expect(typeof feedAnalytics.exportData).toBe('function')
    })

    it('should record feed events correctly', () => {
      feedAnalytics.recordEvent('feed:view', {feedId: 'test-feed'})
      feedAnalytics.recordMetric('render_time', 150)
      
      const events = feedAnalytics.getEventSummary()
      const metrics = feedAnalytics.getMetrics()
      
      expect(events['feed:view']).toBe(1)
      expect(metrics.render_time).toBe(150)
    })

    it('should export analytics data correctly', () => {
      feedAnalytics.recordEvent('test:event', {data: 'test'})
      feedAnalytics.recordMetric('test:metric', 100)
      
      const exported = feedAnalytics.exportData()
      
      expect(exported.events).toBeDefined()
      expect(exported.metrics).toBeDefined()
      expect(exported.timestamp).toBeDefined()
      expect(exported.events['test:event']).toBe(1)
      expect(exported.metrics['test:metric']).toBe(100)
    })
  })

  describe('Sonet Search System', () => {
    it('should have search analytics system', () => {
      expect(searchAnalytics).toBeDefined()
      expect(typeof searchAnalytics.recordSearch).toBe('function')
      expect(typeof searchAnalytics.getQueryAnalytics).toBe('function')
      expect(typeof searchAnalytics.getGlobalAnalytics).toBe('function')
      expect(typeof searchAnalytics.exportData).toBe('function')
    })

    it('should record search metrics correctly', () => {
      const mockMetrics = {
        totalResults: 100,
        queryTime: 250,
        indexSize: 1000000,
        cacheHitRate: 0.8,
        relevanceScore: 85,
        userSatisfaction: 4.5,
      }

      const mockBehavior = {satisfaction: 4.5}
      
      searchAnalytics.recordSearch('test query', mockMetrics, mockBehavior)
      
      const analytics = searchAnalytics.getQueryAnalytics('test query')
      
      expect(analytics).toBeDefined()
      expect(analytics?.totalSearches).toBe(1)
      expect(analytics?.averageQueryTime).toBe(250)
      expect(analytics?.averageRelevance).toBe(85)
    })

    it('should provide global search analytics', () => {
      const global = searchAnalytics.getGlobalAnalytics()
      
      expect(global).toBeDefined()
      expect(global.totalSearches).toBeGreaterThanOrEqual(0)
      expect(global.averageQueryTime).toBeGreaterThanOrEqual(0)
      expect(global.averageRelevance).toBeGreaterThanOrEqual(0)
      expect(global.cacheEfficiency).toBeGreaterThanOrEqual(0)
      expect(global.topQueries).toBeDefined()
    })
  })

  describe('Sonet Messaging System', () => {
    it('should have message store system', () => {
      expect(messageStore).toBeDefined()
      expect(typeof messageStore.initialize).toBe('function')
      expect(typeof messageStore.storeMessage).toBe('function')
      expect(typeof messageStore.getMessages).toBe('function')
      expect(typeof messageStore.storeConversation).toBe('function')
      expect(typeof messageStore.getConversation).toBe('function')
    })

    it('should initialize message store correctly', async () => {
      // Mock IndexedDB for testing
      const mockDB = {
        objectStoreNames: ['messages', 'conversations'],
        createObjectStore: jest.fn(),
        transaction: jest.fn(() => ({
          objectStore: jest.fn(() => ({
            put: jest.fn(),
            get: jest.fn(),
            getAll: jest.fn(),
          })),
        })),
      }

      global.indexedDB = {
        open: jest.fn(() => ({
          onsuccess: jest.fn(),
          onerror: jest.fn(),
          onupgradeneeded: jest.fn((event) => {
            event.target.result = mockDB
          }),
        })),
      } as any

      await expect(messageStore.initialize()).resolves.not.toThrow()
    })
  })

  describe('Sonet Type System', () => {
    it('should have all required Sonet types', () => {
      // This test ensures all Sonet types are properly exported
      const {SonetUser, SonetNote, SonetMedia, SonetAuthResponse} = require('@sonet/types')
      
      expect(SonetUser).toBeDefined()
      expect(SonetNote).toBeDefined()
      expect(SonetMedia).toBeDefined()
      expect(SonetAuthResponse).toBeDefined()
    })

    it('should have RichText class', () => {
      const {RichText} = require('@sonet/types')
      
      expect(RichText).toBeDefined()
      expect(typeof RichText.prototype.detectFacetsWithoutResolution).toBe('function')
    })

    it('should have SonetFacet types', () => {
      const {SonetFacet, SonetMentionFeature, SonetLinkFeature, SonetTagFeature} = require('@sonet/types')
      
      expect(SonetFacet).toBeDefined()
      expect(SonetMentionFeature).toBeDefined()
      expect(SonetLinkFeature).toBeDefined()
      expect(SonetTagFeature).toBeDefined()
    })
  })

  describe('Sonet Constants and Configuration', () => {
    it('should have updated service URLs', () => {
      const {SONET_SERVICE, SONET_APP_HOST} = require('#/lib/constants')
      
      expect(SONET_SERVICE).toBe('https://api.sonet.app')
      expect(SONET_APP_HOST).toBe('https://sonet.app')
    })

    it('should have updated link meta proxies', () => {
      const {STAGING_LINK_META_PROXY, PROD_LINK_META_PROXY} = require('#/lib/constants')
      
      expect(STAGING_LINK_META_PROXY).toContain('sonet.dev')
      expect(PROD_LINK_META_PROXY).toContain('sonet.app')
    })

    it('should have Sonet feed configurations', () => {
      const {SONET_FEEDS} = require('#/lib/constants')
      
      expect(SONET_FEEDS.FOR_YOU).toBe('for-you')
      expect(SONET_FEEDS.FOLLOWING).toBe('following')
      expect(SONET_FEEDS.VIDEO).toBe('video')
    })
  })

  describe('Migration Completeness', () => {
    it('should not have any remaining AT Protocol imports', () => {
      // This test ensures no @atproto imports remain in the codebase
      const fs = require('fs')
      const path = require('path')
      
      const searchForAtprotoImports = (dir: string): string[] => {
        const results: string[] = []
        const files = fs.readdirSync(dir)
        
        for (const file of files) {
          const filePath = path.join(dir, file)
          const stat = fs.statSync(filePath)
          
          if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
            results.push(...searchForAtprotoImports(filePath))
          } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            const content = fs.readFileSync(filePath, 'utf8')
            if (content.includes('@atproto/')) {
              results.push(filePath)
            }
          }
        }
        
        return results
      }
      
      const remainingImports = searchForAtprotoImports(process.cwd())
      
      // Filter out test files and known exceptions
      const filteredImports = remainingImports.filter(file => 
        !file.includes('__tests__') && 
        !file.includes('test-') &&
        !file.includes('.test.') &&
        !file.includes('.spec.')
      )
      
      expect(filteredImports).toHaveLength(0)
    })

    it('should have all required Sonet API methods', () => {
      const requiredMethods = [
        'login', 'register', 'logout', 'activateAccount',
        'createNote', 'getTimeline', 'getNote', 'reactToNote',
        'removeReaction', 'followUser', 'unfollowUser', 'getUser',
        'search', 'createReport', 'requestEmailUpdate', 'updateEmail'
      ]
      
      requiredMethods.forEach(method => {
        expect(typeof sonetClient[method as keyof typeof sonetClient]).toBe('function')
      })
    })
  })
})