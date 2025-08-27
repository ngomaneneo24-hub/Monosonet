import React, {useState} from 'react'
import {View, StyleSheet, Switch, Alert} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/view/com/util/text/Text'
import {Button} from '#/components/Button'
import {Ghost_Stroke2_Corner0_Rounded as GhostIcon} from '#/components/icons/Ghost'
import {Settings_Stroke2_Corner0_Rounded as SettingsIcon} from '#/components/icons/Settings'

type Props = {
  style?: any
}

export function GhostModePreferences({style}: Props) {
  const {_} = useLingui()
  const t = useTheme()
  
  // Ghost mode preferences state
  const [autoGhostMode, setAutoGhostMode] = useState(false)
  const [ghostModeNotifications, setGhostModeNotifications] = useState(true)
  const [preferredGhostStyle, setPreferredGhostStyle] = useState<'random' | 'cute' | 'spooky'>('random')
  
  // Mock ghost mode statistics (would come from server)
  const ghostStats = {
    totalGhostReplies: 42,
    favoriteGhostAvatar: 'ghost-7',
    mostActiveThread: 'Politics Discussion',
    ghostModeUsage: 0.15, // 15% of total replies
  }
  
  const handleResetGhostStats = () => {
    Alert.alert(
      _(msg`Reset Ghost Statistics`),
      _(msg`Are you sure you want to reset your ghost mode statistics? This action cannot be undone.`),
      [
        {text: _(msg`Cancel`), style: 'cancel'},
        {
          text: _(msg`Reset`),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              _(msg`Statistics Reset`),
              _(msg`Your ghost mode statistics have been reset.`),
              [{text: 'OK'}]
            )
          },
        },
      ]
    )
  }
  
  const getGhostStyleLabel = (style: string) => {
    switch (style) {
      case 'random': return _(msg`Random (Default)`)
      case 'cute': return _(msg`Cute Ghosts Only`)
      case 'spooky': return _(msg`Spooky Ghosts Only`)
      default: return _(msg`Random (Default)`)
    }
  }
  
  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={[styles.header, {backgroundColor: t.palette.primary_50, borderColor: t.palette.primary_200}]}>
        <GhostIcon size="lg" style={{color: t.palette.primary_500}} />
        <Text style={[a.text_lg, a.font_bold, {color: t.palette.primary_700}]}>
          Ghost Mode Preferences
        </Text>
        <Text style={[a.text_sm, {color: t.palette.primary_600}]}>
          Customize your anonymous commenting experience
        </Text>
      </View>
      
      {/* Preferences Section */}
      <View style={styles.section}>
        <Text style={[a.text_md, a.font_bold, {color: t.palette.text_primary, marginBottom: 12}]}>
          <Trans>Settings</Trans>
        </Text>
        
        {/* Auto Ghost Mode */}
        <View style={styles.preferenceRow}>
          <View style={styles.preferenceInfo}>
            <Text style={[a.text_sm, {color: t.palette.text_primary}]}>
              <Trans>Auto-activate Ghost Mode</Trans>
            </Text>
            <Text style={[a.text_xs, {color: t.palette.text_contrast_low}]}>
              <Trans>Automatically enable ghost mode for new threads</Trans>
            </Text>
          </View>
          <Switch
            value={autoGhostMode}
            onValueChange={setAutoGhostMode}
            trackColor={{false: t.palette.border_contrast_low, true: t.palette.primary_500}}
            thumbColor={autoGhostMode ? t.palette.primary_100 : t.palette.background_primary}
          />
        </View>
        
        {/* Ghost Mode Notifications */}
        <View style={styles.preferenceRow}>
          <View style={styles.preferenceInfo}>
            <Text style={[a.text_sm, {color: t.palette.text_primary}]}>
              <Trans>Ghost Mode Notifications</Trans>
            </Text>
            <Text style={[a.text_xs, {color: t.palette.text_contrast_low}]}>
              <Trans>Get notified when someone replies to your ghost comments</Trans>
            </Text>
          </View>
          <Switch
            value={ghostModeNotifications}
            onValueChange={setGhostModeNotifications}
            trackColor={{false: t.palette.border_contrast_low, true: t.palette.primary_500}}
            thumbColor={ghostModeNotifications ? t.palette.primary_100 : t.palette.background_primary}
          />
        </View>
        
        {/* Preferred Ghost Style */}
        <View style={styles.preferenceRow}>
          <View style={styles.preferenceInfo}>
            <Text style={[a.text_sm, {color: t.palette.text_primary}]}>
              <Trans>Preferred Ghost Style</Trans>
            </Text>
            <Text style={[a.text_xs, {color: t.palette.text_contrast_low}]}>
              <Trans>Choose your preferred ghost avatar style</Trans>
            </Text>
          </View>
          <Button
            onPress={() => {
              // Cycle through ghost styles
              const styles = ['random', 'cute', 'spooky'] as const
              const currentIndex = styles.indexOf(preferredGhostStyle)
              const nextIndex = (currentIndex + 1) % styles.length
              setPreferredGhostStyle(styles[nextIndex])
            }}
            style={[a.p_xs]}
            label={getGhostStyleLabel(preferredGhostStyle)}
            variant="ghost"
            shape="round"
            color="secondary"
            size="small">
            <Trans>{getGhostStyleLabel(preferredGhostStyle)}</Trans>
          </Button>
        </View>
      </View>
      
      {/* Statistics Section */}
      <View style={styles.section}>
        <Text style={[a.text_md, a.font_bold, {color: t.palette.text_primary, marginBottom: 12}]}>
          <Trans>Your Ghost Statistics</Trans>
        </Text>
        
        <View style={styles.statsGrid}>
          <View style={[styles.statItem, {backgroundColor: t.palette.primary_50}]}>
            <Text style={[a.text_lg, a.font_bold, {color: t.palette.primary_700}]}>
              {ghostStats.totalGhostReplies}
            </Text>
            <Text style={[a.text_xs, {color: t.palette.primary_600}]}>
              <Trans>Total Ghost Replies</Trans>
            </Text>
          </View>
          
          <View style={[styles.statItem, {backgroundColor: t.palette.primary_50}]}>
            <Text style={[a.text_lg, a.font_bold, {color: t.palette.primary_700}]}>
              {Math.round(ghostStats.ghostModeUsage * 100)}%
            </Text>
            <Text style={[a.text_xs, {color: t.palette.primary_600}]}>
              <Trans>Ghost Mode Usage</Trans>
            </Text>
          </View>
        </View>
        
        <View style={styles.statRow}>
          <Text style={[a.text_sm, {color: t.palette.text_contrast_low}]}>
            <Trans>Favorite Ghost:</Trans>
          </Text>
          <Text style={[a.text_sm, a.font_medium, {color: t.palette.text_primary}]}>
            Ghost #{ghostStats.favoriteGhostAvatar}
          </Text>
        </View>
        
        <View style={styles.statRow}>
          <Text style={[a.text_sm, {color: t.palette.text_contrast_low}]}>
            <Trans>Most Active Thread:</Trans>
          </Text>
          <Text style={[a.text_sm, a.font_medium, {color: t.palette.text_primary}]}>
            {ghostStats.mostActiveThread}
          </Text>
        </View>
        
        <Button
          onPress={handleResetGhostStats}
          style={[a.p_sm, a.mt_sm]}
          label={_(msg`Reset Statistics`)}
          variant="ghost"
          shape="round"
          color="secondary"
          size="small">
          <Trans>Reset Statistics</Trans>
        </Button>
      </View>
      
      {/* Footer */}
      <View style={[styles.footer, {backgroundColor: t.palette.background_secondary}]}>
        <Text style={[a.text_xs, {color: t.palette.text_contrast_low, textAlign: 'center'}]}>
          <Trans>Ghost mode preferences are stored locally and never shared with other users.</Trans>
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  preferenceInfo: {
    flex: 1,
    marginRight: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
})