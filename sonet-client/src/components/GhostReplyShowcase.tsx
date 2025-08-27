import React, {useState} from 'react'
import {View, StyleSheet, ScrollView, Alert} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/view/com/util/text/Text'
import {Button} from '#/components/Button'
import {GhostReply} from './GhostReply'
import {GhostReplyList} from './GhostReplyList'
import {GhostReplyManager} from './GhostReplyManager'
import {GhostModePreferences} from './GhostModePreferences'
import {Ghost_Stroke2_Corner0_Rounded as GhostIcon} from '#/components/icons/Ghost'
import {Settings_Stroke2_Corner0_Rounded as SettingsIcon} from '#/components/icons/Settings'
import {Trash_Stroke2_Corner0_Rounded as TrashIcon} from '#/components/icons/Trash'

type Props = {
  style?: any
}

export function GhostReplyShowcase({style}: Props) {
  const {_} = useLingui()
  const t = useTheme()
  const [activeTab, setActiveTab] = useState<'demo' | 'list' | 'manager' | 'preferences'>('demo')
  
  // Mock data for demonstration
  const mockGhostReplies = [
    {
      id: 'ghost-1',
      content: "This is such a great point! I've been thinking about this for a while now.",
      ghostAvatar: '/assets/ghosts/ghost-1.jpg',
      ghostId: 'Ghost #7A3F',
      threadId: 'thread-123',
      createdAt: new Date(Date.now() - 1000 * 60 * 30),
      isGhostReply: true as const,
    },
    {
      id: 'ghost-2',
      content: "I completely disagree with the previous comment. This approach has been tried before and failed.",
      ghostAvatar: '/assets/ghosts/ghost-2.jpg',
      ghostId: 'Ghost #2B9E',
      threadId: 'thread-123',
      createdAt: new Date(Date.now() - 1000 * 60 * 15),
      isGhostReply: true as const,
    },
    {
      id: 'ghost-3',
      content: "Can someone explain this in simpler terms? I'm trying to understand the concept.",
      ghostAvatar: '/assets/ghosts/ghost-3.jpg',
      ghostId: 'Ghost #F4C7',
      threadId: 'thread-123',
      createdAt: new Date(Date.now() - 1000 * 60 * 5),
      isGhostReply: true as const,
    },
  ]
  
  const tabs = [
    {id: 'demo', label: 'Demo', icon: GhostIcon},
    {id: 'list', label: 'List View', icon: GhostIcon},
    {id: 'manager', label: 'Manager', icon: TrashIcon},
    {id: 'preferences', label: 'Settings', icon: SettingsIcon},
  ] as const
  
  const renderTabContent = () => {
    switch (activeTab) {
      case 'demo':
        return (
          <View style={styles.tabContent}>
            <Text style={[a.text_lg, a.font_bold, {color: t.palette.text_primary, marginBottom: 16}]}>
              👻 Ghost Reply Demo
            </Text>
            <Text style={[a.text_sm, {color: t.palette.text_contrast_low, marginBottom: 20}]}>
              Here's how ghost replies look in a thread. Each ghost has a unique avatar and ephemeral ID.
            </Text>
            
            {mockGhostReplies.map((reply, index) => (
              <GhostReply
                key={reply.id}
                content={reply.content}
                ghostAvatar={reply.ghostAvatar}
                ghostId={reply.ghostId}
                timestamp={reply.createdAt}
                ghostReplyId={reply.id}
                threadId="showcase" // Context for showcase view
                style={[
                  styles.demoReply,
                  index > 0 && {borderTopWidth: 1, borderTopColor: t.palette.border_contrast_low}
                ]}
              />
            ))}
          </View>
        )
        
      case 'list':
        return (
          <View style={styles.tabContent}>
            <Text style={[a.text_lg, a.font_bold, {color: t.palette.text_primary, marginBottom: 16}]}>
              📋 Ghost Reply List
            </Text>
            <Text style={[a.text_sm, {color: t.palette.text_contrast_low, marginBottom: 20}]}>
              This shows how ghost replies are displayed in a thread with the GhostReplyList component.
            </Text>
            
            <GhostReplyList threadId="thread-123" />
          </View>
        )
        
      case 'manager':
        return (
          <View style={styles.tabContent}>
            <Text style={[a.text_lg, a.font_bold, {color: t.palette.text_primary, marginBottom: 16}]}>
              🛠️ Ghost Reply Manager
            </Text>
            <Text style={[a.text_sm, {color: t.palette.text_contrast_low, marginBottom: 20}]}>
              Moderators can use this to manage and delete ghost replies.
            </Text>
            
            <GhostReplyManager
              ghostReplies={mockGhostReplies}
              onClose={() => setActiveTab('demo')}
            />
          </View>
        )
        
      case 'preferences':
        return (
          <View style={styles.tabContent}>
            <Text style={[a.text_lg, a.font_bold, {color: t.palette.text_primary, marginBottom: 16}]}>
              ⚙️ Ghost Mode Preferences
            </Text>
            <Text style={[a.text_sm, {color: t.palette.text_contrast_low, marginBottom: 20}]}>
              Users can customize their ghost mode experience and view statistics.
            </Text>
            
            <GhostModePreferences />
          </View>
        )
        
      default:
        return null
    }
  }
  
  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={[styles.header, {backgroundColor: t.palette.primary_50, borderColor: t.palette.primary_200}]}>
        <GhostIcon size="xl" style={{color: t.palette.primary_500}} />
        <Text style={[a.text_xl, a.font_bold, {color: t.palette.primary_700}]}>
          Ghost Reply Feature Showcase
        </Text>
        <Text style={[a.text_sm, {color: t.palette.primary_600, textAlign: 'center'}]}>
          Complete implementation of anonymous commenting with custom ghost avatars
        </Text>
      </View>
      
      {/* Tab Navigation */}
      <View style={[styles.tabBar, {backgroundColor: t.palette.background_secondary, borderColor: t.palette.border_contrast_low}]}>
        {tabs.map((tab) => {
          const IconComponent = tab.icon
          const isActive = activeTab === tab.id
          
          return (
            <Button
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[
                a.p_sm,
                styles.tabButton,
                isActive && {backgroundColor: t.palette.primary_100}
              ]}
              label={tab.label}
              variant="ghost"
              shape="round"
              color={isActive ? "primary" : "secondary"}
              size="small">
              <IconComponent 
                size="sm" 
                style={{color: isActive ? t.palette.primary_500 : t.palette.text_contrast_low}}
              />
              <Text style={[
                a.text_xs,
                {color: isActive ? t.palette.primary_500 : t.palette.text_contrast_low}
              ]}>
                {tab.label}
              </Text>
            </Button>
          )
        })}
      </View>
      
      {/* Tab Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderTabContent()}
      </ScrollView>
      
      {/* Footer */}
      <View style={[styles.footer, {backgroundColor: t.palette.background_secondary}]}>
        <Text style={[a.text_xs, {color: t.palette.text_contrast_low, textAlign: 'center'}]}>
          <Trans>This showcase demonstrates all ghost reply features. Upload your ghost avatars to see them in action!</Trans>
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  tabBar: {
    flexDirection: 'row',
    padding: 8,
    gap: 4,
    borderBottomWidth: 1,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
  },
  demoReply: {
    borderBottomWidth: 0,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
})