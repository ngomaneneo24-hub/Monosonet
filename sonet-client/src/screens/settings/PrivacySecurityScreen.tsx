import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import screenshotProtection from '@/services/screenshotProtection';
import { TouchableOpacity } from 'react-native-gesture-handler';

interface SettingItemProps {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showDivider?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({
  title,
  subtitle,
  icon,
  onPress,
  rightElement,
  showDivider = true,
}) => {
  const { colors } = useTheme();
  
  return (
    <>
      <TouchableOpacity
        style={[styles.settingItem, { borderBottomColor: colors.border }]}
        onPress={onPress}
        disabled={!onPress}
      >
        <View style={styles.settingItemLeft}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name={icon} size={20} color={colors.primary} />
          </View>
          <View style={styles.settingItemText}>
            <Text style={[styles.settingTitle, { color: colors.text }]}>
              {title}
            </Text>
            {subtitle && (
              <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>
        {rightElement && (
          <View style={styles.settingItemRight}>
            {rightElement}
          </View>
        )}
      </TouchableOpacity>
      {showDivider && (
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
      )}
    </>
  );
};

const PrivacySecurityScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [screenshotProtectionEnabled, setScreenshotProtectionEnabled] = useState(false);
  const [blockScreenshots, setBlockScreenshots] = useState(true);
  const [blockScreenRecording, setBlockScreenRecording] = useState(true);
  const [showWarning, setShowWarning] = useState(true);

  useEffect(() => {
    loadScreenshotProtectionConfig();
  }, []);

  const loadScreenshotProtectionConfig = async () => {
    try {
      const config = screenshotProtection.getConfig();
      setScreenshotProtectionEnabled(config.enabled);
      setBlockScreenshots(config.blockScreenshots);
      setBlockScreenRecording(config.blockScreenRecording);
      setShowWarning(config.showWarning);
    } catch (error) {
      console.warn('Failed to load screenshot protection config:', error);
    }
  };

  const handleScreenshotProtectionToggle = async (value: boolean) => {
    try {
      setScreenshotProtectionEnabled(value);
      await screenshotProtection.updateConfig({ enabled: value });
      
      if (value) {
        await screenshotProtection.enableProtection();
      } else {
        await screenshotProtection.disableProtection();
      }
    } catch (error) {
      console.warn('Failed to update screenshot protection:', error);
      setScreenshotProtectionEnabled(!value); // Revert on error
    }
  };

  const handleBlockScreenshotsToggle = async (value: boolean) => {
    try {
      setBlockScreenshots(value);
      await screenshotProtection.updateConfig({ blockScreenshots: value });
    } catch (error) {
      console.warn('Failed to update screenshot blocking:', error);
      setBlockScreenshots(!value);
    }
  };

  const handleBlockScreenRecordingToggle = async (value: boolean) => {
    try {
      setBlockScreenRecording(value);
      await screenshotProtection.updateConfig({ blockScreenRecording: value });
    } catch (error) {
      console.warn('Failed to update screen recording blocking:', error);
      setBlockScreenRecording(!value);
    }
  };

  const handleShowWarningToggle = async (value: boolean) => {
    try {
      setShowWarning(value);
      await screenshotProtection.updateConfig({ showWarning: value });
    } catch (error) {
      console.warn('Failed to update warning display:', error);
      setShowWarning(!value);
    }
  };

  const showPlatformLimitations = () => {
    const limitations = screenshotProtection.getPlatformLimitations();
    Alert.alert(
      'Platform Limitations',
      limitations.join('\n\n'),
      [{ text: 'OK' }]
    );
  };

  const showRecommendedSettings = () => {
    const recommended = screenshotProtection.getRecommendedSettings();
    Alert.alert(
      'Recommended Settings',
      'For maximum privacy protection, we recommend:\n\n' +
      '• Enable screenshot protection\n' +
      '• Block screenshots\n' +
      '• Block screen recording\n' +
      '• Show warnings',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: async () => {
            try {
              await screenshotProtection.updateConfig(recommended);
              await loadScreenshotProtectionConfig();
            } catch (error) {
              console.warn('Failed to apply recommended settings:', error);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Privacy & Security
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Manage your privacy settings and security preferences
          </Text>
        </View>

        {/* Screenshot Protection Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Screenshot Protection
          </Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Protect your private conversations from being captured
          </Text>
          
          <View style={styles.sectionContent}>
            <SettingItem
              title="Enable Screenshot Protection"
              subtitle="Block screenshots and screen recording in DMs"
              icon="shield-checkmark"
              rightElement={
                <Switch
                  value={screenshotProtectionEnabled}
                  onValueChange={handleScreenshotProtectionToggle}
                  trackColor={{ false: colors.border, true: colors.primary + '40' }}
                  thumbColor={screenshotProtectionEnabled ? colors.primary : colors.textSecondary}
                />
              }
            />

            {screenshotProtectionEnabled && (
              <>
                <SettingItem
                  title="Block Screenshots"
                  subtitle="Prevent screenshots in private conversations"
                  icon="camera-off"
                  rightElement={
                    <Switch
                      value={blockScreenshots}
                      onValueChange={handleBlockScreenshotsToggle}
                      trackColor={{ false: colors.border, true: colors.primary + '40' }}
                      thumbColor={blockScreenshots ? colors.primary : colors.textSecondary}
                    />
                  }
                />

                <SettingItem
                  title="Block Screen Recording"
                  subtitle="Prevent screen recording in private conversations"
                  icon="videocam-off"
                  rightElement={
                    <Switch
                      value={blockScreenRecording}
                      onValueChange={handleBlockScreenRecordingToggle}
                      trackColor={{ false: colors.border, true: colors.primary + '40' }}
                      thumbColor={blockScreenRecording ? colors.primary : colors.textSecondary}
                    />
                  }
                />

                <SettingItem
                  title="Show Warnings"
                  subtitle="Display privacy warnings in conversations"
                  icon="warning"
                  rightElement={
                    <Switch
                      value={showWarning}
                      onValueChange={handleShowWarningToggle}
                      trackColor={{ false: colors.border, true: colors.primary + '40' }}
                      thumbColor={showWarning ? colors.primary : colors.textSecondary}
                    />
                  }
                />
              </>
            )}

            {/* iOS Limitation Warning */}
            {Platform.OS === 'ios' && screenshotProtectionEnabled && (
              <View style={[styles.warningContainer, { backgroundColor: colors.warning + '20' }]}>
                <Ionicons name="warning" size={20} color={colors.warning} />
                <Text style={[styles.warningText, { color: colors.warning }]}>
                  ⚠️ iOS Limitation: Screenshots cannot be completely prevented on iPhone due to underlying system restrictions. This setting provides the maximum protection possible within iOS constraints.
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary + '20' }]}
                onPress={showPlatformLimitations}
              >
                <Ionicons name="information-circle" size={20} color={colors.primary} />
                <Text style={[styles.actionButtonText, { color: colors.primary }]}>
                  Platform Limitations
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.success + '20' }]}
                onPress={showRecommendedSettings}
              >
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={[styles.actionButtonText, { color: colors.success }]}>
                  Recommended Settings
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Other Privacy Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Privacy Settings
          </Text>
          
          <SettingItem
            title="Profile Visibility"
            subtitle="Control who can see your profile"
            icon="eye"
            onPress={() => {/* Navigate to profile visibility settings */}}
          />

          <SettingItem
            title="Message Requests"
            subtitle="Manage incoming message requests"
            icon="mail"
            onPress={() => {/* Navigate to message request settings */}}
          />

          <SettingItem
            title="Blocked Users"
            subtitle="Manage your blocked users list"
            icon="ban"
            onPress={() => {/* Navigate to blocked users */}}
          />
        </View>

        {/* Security Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Security Settings
          </Text>
          
          <SettingItem
            title="Two-Factor Authentication"
            subtitle="Add an extra layer of security"
            icon="lock-closed"
            onPress={() => {/* Navigate to 2FA settings */}}
          />

          <SettingItem
            title="Login Sessions"
            subtitle="Manage your active sessions"
            icon="phone-portrait"
            onPress={() => {/* Navigate to session management */}}
          />

          <SettingItem
            title="Password Change"
            subtitle="Update your account password"
            icon="key"
            onPress={() => {/* Navigate to password change */}}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  sectionContent: {
    paddingHorizontal: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  settingItemText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  settingItemRight: {
    marginLeft: 16,
  },
  divider: {
    height: 1,
    marginLeft: 72,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default PrivacySecurityScreen;