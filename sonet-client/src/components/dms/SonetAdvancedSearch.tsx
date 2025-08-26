import React, {useCallback, useState, useMemo, useRef, useEffect} from 'react'
import {View, TextInput, TouchableOpacity, ScrollView, Animated} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import AnimatedView, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutUp,
  Layout,
} from 'react-native-reanimated'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {Search_Stroke2_Corner0_Rounded as SearchIcon} from '#/components/icons/Search'
import {Filter_Stroke2_Corner0_Rounded as FilterIcon} from '#/components/icons/Filter'
import {X_Stroke2_Corner0_Rounded as CloseIcon} from '#/components/icons/Times'
import {Calendar_Stroke2_Corner0_Rounded as CalendarIcon} from '#/components/icons/Calendar'
import {User_Stroke2_Corner0_Rounded as UserIcon} from '#/components/icons/User'
import {Hashtag_Stroke2_Corner0_Rounded as HashtagIcon} from '#/components/icons/Hashtag'
import {Image_Stroke2_Corner0_Rounded as ImageIcon} from '#/components/icons/Image'
import {File_Stroke2_Corner0_Rounded as FileIcon} from '#/components/icons/File'
import {Check_Stroke2_Corner0_Rounded as CheckIcon} from '#/components/icons/Check'

// Search filter types
interface SearchFilters {
  dateRange: {
    start: Date | null
    end: Date | null
  }
  sender: string[]
  messageType: ('text' | 'image' | 'file' | 'audio' | 'video')[]
  hasAttachments: boolean | null
  hasReactions: boolean | null
  isEncrypted: boolean | null
  threadDepth: number | null
}

// Search result with highlight information
interface SearchResult {
  messageId: string
  content: string
  senderName: string
  timestamp: string
  threadId?: string
  threadDepth: number
  messageType: string
  hasAttachments: boolean
  hasReactions: boolean
  isEncrypted: boolean
  highlights: Array<{
    start: number
    end: number
    type: 'exact' | 'fuzzy' | 'keyword'
  }>
  relevance: number
}

interface SonetAdvancedSearchProps {
  isVisible: boolean
  onClose: () => void
  onResultSelect: (result: SearchResult) => void
  conversationId: string
  messages: any[]
}

export function SonetAdvancedSearch({
  isVisible,
  onClose,
  onResultSelect,
  conversationId,
  messages,
}: SonetAdvancedSearchProps) {
  const t = useTheme()
  const {_} = useLingui()
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<SearchFilters>({
    dateRange: { start: null, end: null },
    sender: [],
    messageType: [],
    hasAttachments: null,
    hasReactions: null,
    isEncrypted: null,
    threadDepth: null,
  })
  const [showFilters, setShowFilters] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [activeFilters, setActiveFilters] = useState(0)
  const searchInputRef = useRef<TextInput>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  // Calculate active filters count
  useEffect(() => {
    let count = 0
    if (filters.dateRange.start || filters.dateRange.end) count++
    if (filters.sender.length > 0) count++
    if (filters.messageType.length > 0) count++
    if (filters.hasAttachments !== null) count++
    if (filters.hasReactions !== null) count++
    if (filters.isEncrypted !== null) count++
    if (filters.threadDepth !== null) count++
    setActiveFilters(count)
  }, [filters])

  // Perform search with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (searchQuery.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch()
      }, 300)
    } else {
      setSearchResults([])
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, filters])

  // Perform advanced search
  const performSearch = useCallback(async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    
    try {
      // Simulate search delay for better UX
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const results = messages
        .filter(message => {
          // Apply filters
          if (filters.dateRange.start && new Date(message.timestamp) < filters.dateRange.start) return false
          if (filters.dateRange.end && new Date(message.timestamp) > filters.dateRange.end) return false
          if (filters.sender.length > 0 && !filters.sender.includes(message.senderId)) return false
          if (filters.messageType.length > 0 && !filters.messageType.includes(message.type || 'text')) return false
          if (filters.hasAttachments !== null && !!message.attachments !== filters.hasAttachments) return false
          if (filters.hasReactions !== null && !!message.reactions !== filters.hasReactions) return false
          if (filters.isEncrypted !== null && !!message.isEncrypted !== filters.isEncrypted) return false
          if (filters.threadDepth !== null && (message.threadDepth || 0) !== filters.threadDepth) return false
          
          return true
        })
        .map(message => {
          // Calculate relevance and highlights
          const content = message.content.toLowerCase()
          const query = searchQuery.toLowerCase()
          const highlights: Array<{start: number, end: number, type: 'exact' | 'fuzzy' | 'keyword'}> = []
          let relevance = 0

          // Exact match
          if (content.includes(query)) {
            const start = content.indexOf(query)
            highlights.push({
              start,
              end: start + query.length,
              type: 'exact'
            })
            relevance += 100
          }

          // Keyword matches
          const keywords = query.split(' ').filter(k => k.length > 2)
          keywords.forEach(keyword => {
            if (content.includes(keyword)) {
              const start = content.indexOf(keyword)
              highlights.push({
                start,
                end: start + keyword.length,
                type: 'keyword'
              })
              relevance += 50
            }
          })

          // Fuzzy matching (simple implementation)
          if (highlights.length === 0) {
            const words = content.split(' ')
            words.forEach(word => {
              if (word.length > 3 && query.split('').some(char => word.includes(char))) {
                relevance += 10
              }
            })
          }

          // Boost relevance for recent messages
          const daysAgo = (Date.now() - new Date(message.timestamp).getTime()) / (1000 * 60 * 60 * 24)
          if (daysAgo < 1) relevance += 20
          else if (daysAgo < 7) relevance += 10

          return {
            messageId: message.id,
            content: message.content,
            senderName: message.senderName || 'Unknown',
            timestamp: message.timestamp,
            threadId: message.threadId,
            threadDepth: message.threadDepth || 0,
            messageType: message.type || 'text',
            hasAttachments: !!message.attachments,
            hasReactions: !!message.reactions,
            isEncrypted: !!message.isEncrypted,
            highlights,
            relevance,
          }
        })
        .filter(result => result.relevance > 0)
        .sort((a, b) => b.relevance - a.relevance)

      setSearchResults(results)
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsSearching(false)
    }
  }, [searchQuery, filters, messages])

  // Handle filter change
  const handleFilterChange = useCallback((key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }))
  }, [])

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({
      dateRange: { start: null, end: null },
      sender: [],
      messageType: [],
      hasAttachments: null,
      hasReactions: null,
      isEncrypted: null,
      threadDepth: null,
    })
  }, [])

  // Highlight text with search terms
  const renderHighlightedText = useCallback((text: string, highlights: SearchResult['highlights']) => {
    if (highlights.length === 0) return text

    const parts: React.ReactNode[] = []
    let lastIndex = 0

    highlights
      .sort((a, b) => a.start - b.start)
      .forEach((highlight, index) => {
        // Add text before highlight
        if (highlight.start > lastIndex) {
          parts.push(
            <Text key={`text-${index}`} style={[t.atoms.text]}>
              {text.substring(lastIndex, highlight.start)}
            </Text>
          )
        }

        // Add highlighted text
        const highlightedText = text.substring(highlight.start, highlight.end)
        parts.push(
          <Text
            key={`highlight-${index}`}
            style={[
              t.atoms.text,
              t.atoms.bg_primary_25,
              t.atoms.text_primary,
              a.font_bold,
            ]}>
            {highlightedText}
          </Text>
        )

        lastIndex = highlight.end
      })

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        <Text key="text-end" style={[t.atoms.text]}>
          {text.substring(lastIndex)}
        </Text>
      )
    }

    return parts
  }, [t])

  if (!isVisible) return null

  return (
    <AnimatedView
      entering={SlideInDown.springify().mass(0.3)}
      exiting={SlideOutUp.springify().mass(0.3)}
      style={[
        a.absolute,
        a.top_0,
        a.left_0,
        a.right_0,
        a.bottom_0,
        t.atoms.bg,
        a.z_50,
      ]}>
      
      {/* Search Header */}
      <View style={[
        a.px_md,
        a.py_sm,
        a.border_b,
        t.atoms.border_contrast_25,
        t.atoms.bg,
      ]}>
        <View style={[a.flex_row, a.items_center, a.gap_sm]}>
          <TouchableOpacity onPress={onClose}>
            <CloseIcon size="sm" style={[t.atoms.text_contrast_medium]} />
          </TouchableOpacity>
          
          <View style={[a.flex_1, a.relative]}>
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
              placeholder={_('Search messages...')}
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
          
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            style={[
              a.p_2,
              a.rounded_full,
              showFilters ? t.atoms.bg_primary : t.atoms.bg_contrast_25,
            ]}>
            <FilterIcon
              size="sm"
              style={[
                showFilters ? t.atoms.text_on_primary : t.atoms.text_contrast_medium,
              ]}
            />
            {activeFilters > 0 && (
              <View style={[
                a.absolute,
                a.top_0,
                a.right_0,
                a.w_4,
                a.h_4,
                a.rounded_full,
                t.atoms.bg_negative,
                a.items_center,
                a.justify_center,
              ]}>
                <Text style={[a.text_xs, t.atoms.text_on_negative, a.font_bold]}>
                  {activeFilters}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Advanced Filters */}
      {showFilters && (
        <AnimatedView
          entering={FadeIn.springify().mass(0.3)}
          exiting={FadeOut.springify().mass(0.3)}
          style={[
            a.px_md,
            a.py_sm,
            a.border_b,
            t.atoms.border_contrast_25,
            t.atoms.bg_contrast_25,
          ]}>
          
          <View style={[a.flex_row, a.items_center, a.justify_between, a.mb_sm]}>
            <Text style={[a.text_sm, a.font_bold, t.atoms.text]}>
              <Trans>Filters</Trans>
            </Text>
            <TouchableOpacity onPress={clearFilters}>
              <Text style={[a.text_xs, t.atoms.text_primary]}>
                <Trans>Clear all</Trans>
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[a.gap_sm]}>
            
            {/* Message Type Filter */}
            <View style={[a.items_center, a.gap_xs]}>
              <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                <Trans>Type</Trans>
              </Text>
              <View style={[a.flex_row, a.gap_xs]}>
                {(['text', 'image', 'file', 'audio', 'video'] as const).map(type => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => {
                      const current = filters.messageType
                      const newValue = current.includes(type)
                        ? current.filter(t => t !== type)
                        : [...current, type]
                      handleFilterChange('messageType', newValue)
                    }}
                    style={[
                      a.px_sm,
                      a.py_xs,
                      a.rounded_sm,
                      a.border,
                      filters.messageType.includes(type)
                        ? [t.atoms.bg_primary, t.atoms.border_primary]
                        : [t.atoms.bg_contrast_25, t.atoms.border_contrast_25],
                    ]}>
                    <Text style={[
                      a.text_xs,
                      filters.messageType.includes(type)
                        ? t.atoms.text_on_primary
                        : t.atoms.text_contrast_medium,
                    ]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Attachment Filter */}
            <View style={[a.items_center, a.gap_xs]}>
              <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                <Trans>Attachments</Trans>
              </Text>
              <View style={[a.flex_row, a.gap_xs]}>
                {([true, false, null] as const).map(hasAttachments => (
                  <TouchableOpacity
                    key={String(hasAttachments)}
                    onPress={() => handleFilterChange('hasAttachments', hasAttachments)}
                    style={[
                      a.px_sm,
                      a.py_xs,
                      a.rounded_sm,
                      a.border,
                      filters.hasAttachments === hasAttachments
                        ? [t.atoms.bg_primary, t.atoms.border_primary]
                        : [t.atoms.bg_contrast_25, t.atoms.border_contrast_25],
                    ]}>
                    <Text style={[
                      a.text_xs,
                      filters.hasAttachments === hasAttachments
                        ? t.atoms.text_on_primary
                        : t.atoms.text_contrast_medium,
                    ]}>
                      {hasAttachments === true ? 'Yes' : hasAttachments === false ? 'No' : 'Any'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Encryption Filter */}
            <View style={[a.items_center, a.gap_xs]}>
              <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                <Trans>Encryption</Trans>
              </Text>
              <View style={[a.flex_row, a.gap_xs]}>
                {([true, false, null] as const).map(isEncrypted => (
                  <TouchableOpacity
                    key={String(isEncrypted)}
                    onPress={() => handleFilterChange('isEncrypted', isEncrypted)}
                    style={[
                      a.px_sm,
                      a.py_xs,
                      a.rounded_sm,
                      a.border,
                      filters.isEncrypted === isEncrypted
                        ? [t.atoms.bg_primary, t.atoms.border_primary]
                        : [t.atoms.bg_contrast_25, t.atoms.border_contrast_25],
                    ]}>
                    <Text style={[
                      a.text_xs,
                      filters.isEncrypted === isEncrypted
                        ? t.atoms.text_on_primary
                        : t.atoms.text_contrast_medium,
                    ]}>
                      {isEncrypted === true ? 'Encrypted' : isEncrypted === false ? 'Plain' : 'Any'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </AnimatedView>
      )}

      {/* Search Results */}
      <ScrollView style={[a.flex_1]} showsVerticalScrollIndicator={false}>
        {isSearching ? (
          <View style={[a.p_md, a.items_center]}>
            <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
              <Trans>Searching...</Trans>
            </Text>
          </View>
        ) : searchResults.length > 0 ? (
          <View style={[a.p_md, a.gap_sm]}>
            {searchResults.map((result, index) => (
              <TouchableOpacity
                key={result.messageId}
                onPress={() => onResultSelect(result)}
                style={[
                  a.p_md,
                  a.rounded_2xl,
                  a.border,
                  t.atoms.bg_contrast_25,
                  t.atoms.border_contrast_25,
                ]}>
                
                {/* Result Header */}
                <View style={[a.flex_row, a.items_center, a.justify_between, a.mb_sm]}>
                  <View style={[a.flex_row, a.items_center, a.gap_sm]}>
                    <Text style={[a.text_sm, a.font_bold, t.atoms.text]}>
                      {result.senderName}
                    </Text>
                    <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                      {new Date(result.timestamp).toLocaleDateString()}
                    </Text>
                  </View>
                  
                  <View style={[a.flex_row, a.items_center, a.gap_xs]}>
                    {result.hasAttachments && (
                      <FileIcon size="xs" style={[t.atoms.text_contrast_medium]} />
                    )}
                    {result.hasReactions && (
                      <HashtagIcon size="xs" style={[t.atoms.text_contrast_medium]} />
                    )}
                    {result.isEncrypted && (
                      <CheckIcon size="xs" style={[t.atoms.text_positive]} />
                    )}
                    {result.threadDepth > 0 && (
                      <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                        Thread {result.threadDepth}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Highlighted Content */}
                <Text style={[a.text_sm, t.atoms.text, a.mb_sm]}>
                  {renderHighlightedText(result.content, result.highlights)}
                </Text>

                {/* Relevance Score */}
                <View style={[a.flex_row, a.items_center, a.justify_between]}>
                  <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                    Relevance: {result.relevance}
                  </Text>
                  <Text style={[a.text_xs, t.atoms.text_primary]}>
                    <Trans>Tap to view</Trans>
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : searchQuery.trim() ? (
          <View style={[a.p_md, a.items_center]}>
            <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
              <Trans>No results found</Trans>
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </AnimatedView>
  )
}