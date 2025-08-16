import React, {useCallback, useState, useMemo} from 'react'
import {View, TextInput, TouchableOpacity, ScrollView} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {Text} from '#/components/Typography'
import {MagnifyingGlass_Stroke2_Corner0_Rounded as SearchIcon} from '#/components/icons/MagnifyingGlass'
import {Filter_Stroke2_Corner0_Rounded as FilterIcon} from '#/components/icons/Filter'
import {Clock_Stroke2_Corner0_Rounded as ClockIcon} from '#/components/icons/Clock'
import {Shield_Stroke2_Corner0_Rounded as ShieldIcon} from '#/components/icons/Shield'
import {Message_Stroke2_Corner0_Rounded as MessageIcon} from '#/components/icons/Message'
import {Person_Stroke2_Corner0_Rounded as PersonIcon} from '#/components/icons/Person'
import {TimeElapsed} from '#/view/com/util/TimeElapsed'

interface SonetSearchResult {
  id: string
  content: string
  senderId: string
  senderName: string
  senderAvatar?: string
  timestamp: string
  chatId: string
  chatTitle: string
  isEncrypted: boolean
  encryptionStatus: 'encrypted' | 'decrypted' | 'failed'
  matchType: 'content' | 'sender' | 'chat'
  matchPosition: number
  matchLength: number
}

interface SonetMessageSearchProps {
  chatId?: string
  onResultPress?: (result: SonetSearchResult) => void
  onClose?: () => void
}

export function SonetMessageSearch({
  chatId,
  onResultPress,
  onClose,
}: SonetMessageSearchProps) {
  const t = useTheme()
  const {_} = useLingui()
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SonetSearchResult[]>([])
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set())
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('all')

  // Available filters
  const availableFilters = useMemo(() => [
    {id: 'encrypted', label: _('Encrypted'), icon: ShieldIcon},
    {id: 'images', label: _('Images'), icon: MessageIcon},
    {id: 'files', label: _('Files'), icon: MessageIcon},
    {id: 'links', label: _('Links'), icon: MessageIcon},
  ], [_])

  // Time range options
  const timeRangeOptions = useMemo(() => [
    {id: 'all', label: _('All time')},
    {id: 'today', label: _('Today')},
    {id: 'week', label: _('This week')},
    {id: 'month', label: _('This month')},
    {id: 'year', label: _('This year')},
  ], [_])

  // Username search
  const usernameSearch = useCallback(async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      // TODO: Implement actual search API call
      // const results = await sonetMessagingApi.searchMessages({
      //   query: searchQuery,
      //   chatId,
      //   filters: Array.from(activeFilters),
      //   timeRange: selectedTimeRange,
      // })
      
      // Simulate search results for now
      const mockResults: SonetSearchResult[] = [
        {
          id: '1',
          content: `This is a message containing "${searchQuery}" in the content`,
          senderId: 'user1',
          senderName: 'John Doe',
          senderAvatar: undefined,
          timestamp: new Date().toISOString(),
          chatId: 'chat1',
          chatTitle: 'General Chat',
          isEncrypted: true,
          encryptionStatus: 'decrypted',
          matchType: 'content',
          matchPosition: searchQuery.length + 20,
          matchLength: searchQuery.length,
        },
        {
          id: '2',
          content: 'Another message with some content',
          senderId: 'user2',
          senderName: 'Jane Smith',
          senderAvatar: undefined,
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          chatId: 'chat2',
          chatTitle: 'Project Discussion',
          isEncrypted: false,
          encryptionStatus: 'decrypted',
          matchType: 'sender',
          matchPosition: 0,
          matchLength: 0,
        },
      ]

      setSearchResults(mockResults)
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [searchQuery, chatId, activeFilters, selectedTimeRange])

  // Username filter toggle
  const usernameFilterToggle = useCallback((filterId: string) => {
    const newFilters = new Set(activeFilters)
    if (newFilters.has(filterId)) {
      newFilters.delete(filterId)
    } else {
      newFilters.add(filterId)
    }
    setActiveFilters(newFilters)
  }, [activeFilters])

  // Handle time range change
  const handleTimeRangeChange = useCallback((timeRange: string) => {
    setSelectedTimeRange(timeRange)
  }, [])

  // Handle result press
  const handleResultPress = useCallback((result: SonetSearchResult) => {
    if (onResultPress) {
      onResultPress(result)
    }
  }, [onResultPress])

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchQuery('')
    setSearchResults([])
    setActiveFilters(new Set())
    setSelectedTimeRange('all')
  }, [])

  // Highlight search matches in content
  const highlightMatches = useCallback((content: string, matchPosition: number, matchLength: number) => {
    if (matchLength === 0) return content

    const before = content.substring(0, matchPosition)
    const match = content.substring(matchPosition, matchPosition + matchLength)
    const after = content.substring(matchPosition + matchLength)

    return (
      <Text style={[a.text_sm, t.atoms.text]}>
        {before}
        <Text style={[a.text_sm, a.font_bold, t.atoms.bg_warning_25]}>
          {match}
        </Text>
        {after}
      </Text>
    )
  }, [t])

  return (
    <View style={[a.flex_1, t.atoms.bg]}>
      {/* Search Header */}
      <View
        style={[
          a.flex_row,
          a.items_center,
          a.gap_sm,
          a.p_md,
          a.border_b,
          t.atoms.border_contrast_25,
        ]}>
        <TouchableOpacity onPress={onClose} style={[a.p_1]}>
          <Text style={[a.text_lg, t.atoms.text_contrast_medium]}>✕</Text>
        </TouchableOpacity>
        
        <View style={[a.flex_1]}>
          <Text style={[a.text_lg, a.font_bold, t.atoms.text]}>
            <Trans>Search Messages</Trans>
          </Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={[a.p_md, a.gap_sm]}>
        <View
          style={[
            a.flex_row,
            a.items_center,
            a.gap_sm,
            a.px_md,
            a.py_sm,
            a.rounded_2xl,
            a.border,
            t.atoms.bg_contrast_25,
            t.atoms.border_contrast_25,
          ]}>
          <SearchIcon
            size="sm"
            style={[t.atoms.text_contrast_medium]}
          />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={_('Search messages...')}
            placeholderTextColor={t.atoms.text_contrast_medium.color}
            style={[
              a.flex_1,
              a.text_sm,
              t.atoms.text,
            ]}
            onSubmitEditing={usernameSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={usernameClearSearch}
              style={[a.p_1]}>
              <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                ✕
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search Button */}
        <Button
          variant="solid"
          color="primary"
          size="lg"
          onPress={usernameSearch}
          disabled={!searchQuery.trim() || isSearching}>
          <ButtonIcon icon={SearchIcon} />
          <ButtonText>
            {isSearching ? _('Searching...') : _('Search')}
          </ButtonText>
        </Button>
      </View>

      {/* Filters */}
      <View style={[a.px_md, a.pb_md]}>
        <Text style={[a.text_sm, a.font_bold, t.atoms.text, a.mb_sm]}>
          <Trans>Filters</Trans>
        </Text>
        
        {/* Filter Toggles */}
        <View style={[a.flex_row, a.flex_wrap, a.gap_sm]}>
          {availableFilters.map(filter => (
            <TouchableOpacity
              key={filter.id}
              onPress={() => usernameFilterToggle(filter.id)}
              style={[
                a.flex_row,
                a.items_center,
                a.gap_xs,
                a.px_sm,
                a.py_xs,
                a.rounded_full,
                a.border,
                activeFilters.has(filter.id)
                  ? [t.atoms.bg_primary, t.atoms.border_primary]
                  : [t.atoms.bg_contrast_25, t.atoms.border_contrast_25],
              ]}>
              <filter.icon
                size="xs"
                style={activeFilters.has(filter.id) ? t.atoms.text_on_primary : t.atoms.text_contrast_medium}
              />
              <Text
                style={[
                  a.text_xs,
                  activeFilters.has(filter.id) ? t.atoms.text_on_primary : t.atoms.text,
                ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Time Range */}
        <View style={[a.mt_sm]}>
          <Text style={[a.text_xs, t.atoms.text_contrast_medium, a.mb_xs]}>
            <Trans>Time Range</Trans>
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[a.gap_sm]}>
            {timeRangeOptions.map(option => (
              <TouchableOpacity
                key={option.id}
                onPress={() => usernameTimeRangeChange(option.id)}
                style={[
                  a.px_sm,
                  a.py_xs,
                  a.rounded_full,
                  a.border,
                  selectedTimeRange === option.id
                    ? [t.atoms.bg_primary, t.atoms.border_primary]
                    : [t.atoms.bg_contrast_25, t.atoms.border_contrast_25],
                ]}>
                <Text
                  style={[
                    a.text_xs,
                    selectedTimeRange === option.id ? t.atoms.text_on_primary : t.atoms.text,
                  ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Search Results */}
      <View style={[a.flex_1, a.px_md]}>
        {searchResults.length > 0 ? (
          <ScrollView style={[a.flex_1]} contentContainerStyle={[a.gap_sm, a.pb_md]}>
            {searchResults.map(result => (
              <TouchableOpacity
                key={result.id}
                onPress={() => handleResultPress(result)}
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
                    <View
                      style={[
                        a.w_8,
                        a.h_8,
                        a.rounded_full,
                        a.overflow_hidden,
                        a.border,
                        t.atoms.border_contrast_25,
                      ]}>
                      {result.senderAvatar ? (
                        <img
                          src={result.senderAvatar}
                          alt={result.senderName}
                          style={{width: 32, height: 32}}
                        />
                      ) : (
                        <View
                          style={[
                            a.w_full,
                            a.h_full,
                            t.atoms.bg_contrast_25,
                            a.items_center,
                            a.justify_center,
                          ]}>
                          <PersonIcon
                            size="sm"
                            style={[t.atoms.text_contrast_medium]}
                          />
                        </View>
                      )}
                    </View>
                    <View>
                      <Text style={[a.text_sm, a.font_bold, t.atoms.text]}>
                        {result.senderName}
                      </Text>
                      <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                        {result.chatTitle}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={[a.flex_row, a.items_center, a.gap_xs]}>
                    {/* Encryption status */}
                    {result.isEncrypted && (
                      <ShieldIcon
                        size="xs"
                        style={[
                          result.encryptionStatus === 'decrypted'
                            ? t.atoms.text_positive
                            : t.atoms.text_warning,
                        ]}
                      />
                    )}
                    
                    {/* Match type indicator */}
                    <View
                      style={[
                        a.px_xs,
                        a.py_1,
                        a.rounded_sm,
                        t.atoms.bg_primary_25,
                      ]}>
                      <Text style={[a.text_xs, t.atoms.text_primary]}>
                        {result.matchType}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Message Content */}
                <View style={[a.mb_sm]}>
                  {highlightMatches(result.content, result.matchPosition, result.matchLength)}
                </View>

                {/* Timestamp */}
                <View style={[a.flex_row, a.items_center, a.gap_xs]}>
                  <ClockIcon
                    size="xs"
                    style={[t.atoms.text_contrast_medium]}
                  />
                  <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                    <TimeElapsed timestamp={result.timestamp} />
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : searchQuery.trim() && !isSearching ? (
          <View style={[a.flex_1, a.items_center, a.justify_center, a.gap_md]}>
            <MessageIcon
              size="xl"
              style={[t.atoms.text_contrast_medium]}
            />
            <Text style={[a.text_lg, t.atoms.text_contrast_medium, a.text_center]}>
              <Trans>No messages found</Trans>
            </Text>
            <Text style={[a.text_sm, t.atoms.text_contrast_medium, a.text_center]}>
              <Trans>Try adjusting your search terms or filters</Trans>
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  )
}