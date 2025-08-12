import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

interface GroupInfoHeaderProps {
  groupName: string;
  memberCount: number;
  maxMembers: number;
  performanceStatus: 'optimal' | 'good' | 'warning' | 'at_limit';
  onPress?: () => void;
}

const GroupInfoHeader: React.FC<GroupInfoHeaderProps> = ({
  groupName,
  memberCount,
  maxMembers,
  performanceStatus,
  onPress,
}) => {
  const { colors } = useTheme();

  const getPerformanceColor = () => {
    switch (performanceStatus) {
      case 'optimal':
        return colors.success;
      case 'good':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'at_limit':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getPerformanceIcon = () => {
    switch (performanceStatus) {
      case 'optimal':
        return 'checkmark-circle';
      case 'good':
        return 'checkmark-circle';
      case 'warning':
        return 'warning';
      case 'at_limit':
        return 'alert-circle';
      default:
        return 'information-circle';
    }
  };

  const getPerformanceText = () => {
    switch (performanceStatus) {
      case 'optimal':
        return 'Optimal Performance';
      case 'good':
        return 'Good Performance';
      case 'warning':
        return 'Performance Warning';
      case 'at_limit':
        return 'At Member Limit';
      default:
        return 'Unknown Status';
    }
  };

  const showMemberLimitInfo = () => {
    Alert.alert(
      'Group Member Limits',
      `This group currently has ${memberCount} members out of a maximum of ${maxMembers}.\n\n` +
      '• 0-250 members: Optimal performance\n' +
      '• 251-400 members: Good performance\n' +
      '• 401-500 members: Performance warning\n' +
      '• 500 members: Maximum limit\n\n' +
      'The limit ensures buttery smooth key distribution and low latency messaging.',
      [
        { text: 'OK' },
        {
          text: 'Learn More',
          onPress: () => {
            // Navigate to help/documentation
          },
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.surface }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.mainContent}>
        <View style={styles.groupInfo}>
          <Text style={[styles.groupName, { color: colors.text }]} numberOfLines={1}>
            {groupName}
          </Text>
          <Text style={[styles.groupType, { color: colors.textSecondary }]}>
            Group Chat
          </Text>
        </View>

        <View style={styles.memberInfo}>
          <View style={styles.memberCount}>
            <Ionicons name="people" size={16} color={colors.textSecondary} />
            <Text style={[styles.memberCountText, { color: colors.textSecondary }]}>
              {memberCount}/{maxMembers}
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.infoButton}
            onPress={showMemberLimitInfo}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="information-circle" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.performanceIndicator}>
        <View style={[styles.performanceBadge, { backgroundColor: getPerformanceColor() + '20' }]}>
          <Ionicons 
            name={getPerformanceIcon() as any} 
            size={14} 
            color={getPerformanceColor()} 
          />
          <Text style={[styles.performanceText, { color: getPerformanceColor() }]}>
            {getPerformanceText()}
          </Text>
        </View>
      </View>

      {/* Performance warning for large groups */}
      {performanceStatus === 'warning' && (
        <View style={[styles.warningContainer, { backgroundColor: colors.warning + '20' }]}>
          <Ionicons name="warning" size={16} color={colors.warning} />
          <Text style={[styles.warningText, { color: colors.warning }]}>
            Large group size may affect messaging performance. Consider creating subgroups for better experience.
          </Text>
        </View>
      )}

      {/* Member limit warning */}
      {performanceStatus === 'at_limit' && (
        <View style={[styles.limitContainer, { backgroundColor: colors.error + '20' }]}>
          <Ionicons name="alert-circle" size={16} color={colors.error} />
          <Text style={[styles.limitText, { color: colors.error }]}>
            Group has reached maximum member limit. No new members can be added.
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    margin: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mainContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  groupType: {
    fontSize: 14,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberCountText: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoButton: {
    padding: 4,
  },
  performanceIndicator: {
    alignItems: 'flex-start',
  },
  performanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  performanceText: {
    fontSize: 12,
    fontWeight: '500',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  limitContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  limitText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});

export default GroupInfoHeader;