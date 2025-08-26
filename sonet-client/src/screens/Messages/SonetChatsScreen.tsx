import React, {useCallback, useMemo, useState} from 'react'
import {View, TextInput, TouchableOpacity, ScrollView} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useFocusEffect, useNavigation} from '@react-navigation/native'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'

import {useAppState} from '#/lib/hooks/useAppState'
import {useInitialNumToRender} from '#/lib/hooks/useInitialNumToRender'
import {type CommonNavigatorParams, type NavigationProp} from '#/lib/routes/types'
import {useRefreshOnFocus} from '#/components/hooks/useRefreshOnFocus'
import {MagnifyingGlass_Stroke2_Corner0_Rounded as SearchIcon} from '#/components/icons/MagnifyingGlass'
import {Filter_Stroke2_Corner0_Rounded as FilterIcon} from '#/components/icons/Filter'
import {Message_Stroke2_Corner0_Rounded as MessageIcon} from '#/components/icons/Message'
import {Group3_Stroke2_Corner0_Rounded as GroupIcon} from '#/components/icons/Group'
import {Person_Stroke2_Corner0_Rounded as PersonIcon} from '#/components/icons/Person'
import {Plus_Stroke2_Corner0_Rounded as PlusIcon} from '#/components/icons/Plus'
import {SettingsGear2_Stroke2_Corner0_Rounded as SettingsIcon} from '#/components/icons/SettingsGear2'
import {atoms as a, useBreakpoints, useTheme} from '#/alf'
import {AgeRestrictedScreen} from '#/components/ageAssurance/AgeRestrictedScreen'
import {useAgeAssuranceCopy} from '#/components/ageAssurance/useAgeAssuranceCopy'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {type DialogControlProps, useDialogControl} from '#/components/Dialog'
import {NewChat} from '#/components/dms/dialogs/NewChatDialog'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'
import {useSonetListConvos} from '#/state/queries/messages/sonet'
import {SonetChatListItem} from './components/SonetChatListItem'
import {SonetMigrationStatus} from '#/components/SonetMigrationStatus'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'SonetChats'>

// Filter types for conversations
type FilterType = 'all' | 'direct' | 'groups' | 'requests' | 'archived'

interface FilterTab {
  id: FilterType
  label: string
  icon: React.ComponentType<any>
  count?: number
}

export function SonetChatsScreen(props: Props) {
  const {_} = useLingui()
  const aaCopy = useAgeAssuranceCopy()
  
  return (
    <AgeRestrictedScreen
      screenTitle={_(msg`Chats`)}
      infoText={aaCopy.chatsInfoText}>
      <SonetChatsScreenInner {...props} />
    </AgeRestrictedScreen>
  )
}

export function SonetChatsScreenInner({navigation}: Props) {
  const {_} = useLingui()
  const t = useTheme()
  const {gtTablet} = useBreakpoints()
  const newChatControl = useDialogControl()
  
  // State for search and filters
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  
  // Get conversations data
  const {state: conversationsState, actions: conversationsActions} = useSonetListConvos()
  
  // Filter tabs configuration
  const filterTabs: FilterTab[] = useMemo(() => [
    {
      id: 'all',
      label: _('All'),
      icon: MessageIcon,
      count: conversationsState.chats.length,
    },
    {
      id: 'direct',
      label: _('Direct'),
      icon: PersonIcon,
      count: conversationsState.chats.filter(chat => chat.type === 'direct').length,
    },
    {
      id: 'groups',
      label: _('Groups'),
      icon: GroupIcon,
      count: conversationsState.chats.filter(chat => chat.type === 'group').length,
    },
    {
      id: 'requests',
      label: _('Requests'),
      icon: MessageIcon,
      count: conversationsState.chats.filter(chat => chat.status === 'pending').length,
    },
    {
      id: 'archived',
      label: _('Archived'),
      icon: MessageIcon,
      count: conversationsState.chats.filter(chat => chat.isArchived).length,
    },
  ], [conversationsState.chats, _])

  // Filter conversations based on active filter and search query
  const filteredConversations = useMemo(() => {
    let filtered = conversationsState.chats

    // Apply filter type
    switch (activeFilter) {
      case 'direct':
        filtered = filtered.filter(chat => chat.type === 'direct')
        break
      case 'groups':
        filtered = filtered.filter(chat => chat.type === 'group')
        break
      case 'requests':
        filtered = filtered.filter(chat => chat.status === 'pending')
        break
      case 'archived':
        filtered = filtered.filter(chat => chat.isArchived)
        break
      default:
        // 'all' - no filtering
        break
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(chat => {
        // Search in chat name/title
        if (chat.title?.toLowerCase().includes(query)) return true
        
        // Search in participant names
        if (chat.participants?.some(p => 
          p.displayName?.toLowerCase().includes(query) ||
          p.username?.toLowerCase().includes(query)
        )) return true
        
        // Search in last message content
        if (chat.lastMessage?.content?.toLowerCase().includes(query)) return true
        
        return false
      })
    }

    return filtered
  }, [conversationsState.chats, activeFilter, searchQuery])

  // Username search input change
  const usernameSearchChange = useCallback((text: string) => {
    setSearchQuery(text)
  }, [])

  // Username filter tab press
  const usernameFilterTabPress = useCallback((filterId: FilterType) => {
    setActiveFilter(filterId)
  }, [])

  // Username chat item press
  const usernameChatPress = useCallback((chatId: string) => {
    navigation.navigate('SonetConversation', {conversation: chatId})
  }, [navigation])

  // Username new chat
  const usernameNewChat = useCallback(() => {
    newChatControl.open()
  }, [newChatControl])

  // Username settings
  const usernameSettings = useCallback(() => {
    navigation.navigate('MessagesSettings')
  }, [navigation])

  // Refresh conversations
  useRefreshOnFocus(conversationsActions.refreshChats)

  // App state handling
  useAppState({
    onActive: () => {
      conversationsActions.refreshChats()
    },
  })

  return (
    <Layout.Screen testID="sonetChatsScreen">
      {/* Header */}
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content align={gtTablet ? 'left' : 'platform'}>
          <Layout.Header.TitleText>
            <Trans>Chats</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Right>
          <Button
            variant="ghost"
            color="secondary"
            size="small"
            onPress={usernameSettings}
            style={[a.mr_sm]}>
            <ButtonIcon icon={SettingsIcon} />
          </Button>
          <Button
            variant="ghost"
            color="secondary"
            size="small"
            onPress={usernameNewChat}>
            <ButtonIcon icon={PlusIcon} />
          </Button>
        </Layout.Header.Right>
      </Layout.Header.Outer>

      {/* Migration Status */}
      <View style={[a.px_md, a.pt_sm]}>
        <SonetMigrationStatus />
      </View>

      {/* Search Bar */}
      <View style={[a.px_md, a.pt_sm, a.pb_md]}>
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
            onChangeText={usernameSearchChange}
            placeholder={_('Search chats...')}
            placeholderTextColor={t.atoms.text_contrast_medium.color}
            style={[
              a.flex_1,
              a.text_sm,
              t.atoms.text,
            ]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={[a.p_1]}>
              <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                ✕
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={[a.px_md, a.pb_md]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[a.gap_sm]}>
          {filterTabs.map(tab => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => usernameFilterTabPress(tab.id)}
              style={[
                a.flex_row,
                a.items_center,
                a.gap_xs,
                a.px_md,
                a.py_sm,
                a.rounded_full,
                a.border,
                activeFilter === tab.id
                  ? [t.atoms.bg_primary, t.atoms.border_primary]
                  : [t.atoms.bg_contrast_25, t.atoms.border_contrast_25],
              ]}>
              <tab.icon
                size="xs"
                style={activeFilter === tab.id ? t.atoms.text_on_primary : t.atoms.text_contrast_medium}
              />
              <Text
                style={[
                  a.text_sm,
                  a.font_medium,
                  activeFilter === tab.id ? t.atoms.text_on_primary : t.atoms.text,
                ]}>
                {tab.label}
              </Text>
              {tab.count !== undefined && tab.count > 0 && (
                <View
                  style={[
                    a.px_xs,
                    a.py_1,
                    a.rounded_full,
                    a.min_w_5,
                    a.items_center,
                    activeFilter === tab.id
                      ? t.atoms.bg_on_primary
                      : t.atoms.bg_contrast_50,
                  ]}>
                  <Text
                    style={[
                      a.text_xs,
                      a.font_bold,
                      activeFilter === tab.id
                        ? t.atoms.text_primary
                        : t.atoms.text_contrast_medium,
                    ]}>
                    {tab.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Conversations List */}
      <View style={[a.flex_1]}>
        {conversationsState.isLoading ? (
          <View style={[a.flex_1, a.items_center, a.justify_center, a.gap_md]}>
            <Text style={[a.text_lg, t.atoms.text_contrast_medium]}>
              <Trans>Loading conversations...</Trans>
            </Text>
          </View>
        ) : conversationsState.error ? (
          <View style={[a.flex_1, a.items_center, a.justify_center, a.gap_md, a.px_md]}>
            <Text style={[a.text_lg, t.atoms.text_negative, a.text_center]}>
              <Trans>Failed to load conversations</Trans>
            </Text>
            <Text style={[a.text_sm, t.atoms.text_contrast_medium, a.text_center]}>
              {conversationsState.error}
            </Text>
            <Button
              variant="solid"
              color="primary"
              onPress={conversationsActions.refreshChats}>
              <ButtonText>
                <Trans>Retry</Trans>
              </ButtonText>
            </Button>
          </View>
        ) : filteredConversations.length === 0 ? (
          <View style={[a.flex_1, a.items_center, a.justify_center, a.gap_md, a.px_md]}>
            {searchQuery.trim() ? (
              <>
                <Text style={[a.text_lg, t.atoms.text_contrast_medium, a.text_center]}>
                  <Trans>No conversations found</Trans>
                </Text>
                <Text style={[a.text_sm, t.atoms.text_contrast_medium, a.text_center]}>
                  <Trans>Try adjusting your search terms</Trans>
                </Text>
              </>
            ) : (
              <>
                <MessageIcon
                  size="xl"
                  style={[t.atoms.text_contrast_medium]}
                />
                <Text style={[a.text_lg, t.atoms.text_contrast_medium, a.text_center]}>
                  <Trans>No conversations yet</Trans>
                </Text>
                <Text style={[a.text_sm, t.atoms.text_contrast_medium, a.text_center]}>
                  <Trans>Start a new chat to begin messaging</Trans>
                </Text>
                <Button
                  variant="solid"
                  color="primary"
                  onPress={usernameNewChat}>
                  <ButtonText>
                    <Trans>New Chat</Trans>
                  </ButtonText>
                </Button>
              </>
            )}
          </View>
        ) : (
          <ScrollView
            style={[a.flex_1]}
            contentContainerStyle={[a.gap_sm, a.px_md, a.pb_md]}
            showsVerticalScrollIndicator={false}>
            {filteredConversations.map(chat => (
              <SonetChatListItem
                key={chat.id}
                chat={chat}
                onPress={() => usernameChatPress(chat.id)}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* New Chat Dialog */}
      <NewChat control={newChatControl} />
    </Layout.Screen>
  )
}