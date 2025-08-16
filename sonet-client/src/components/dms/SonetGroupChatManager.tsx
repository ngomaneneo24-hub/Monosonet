import React, {useCallback, useState} from 'react'
import {View, TextInput, ScrollView} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {Text} from '#/components/Typography'
import {Person_Stroke2_Corner0_Rounded as PersonIcon} from '#/components/icons/Person'
import {PersonGroup_Stroke2_Corner2_Rounded as PersonGroupIcon} from '#/components/icons/Person'
import {Plus_Stroke2_Corner0_Rounded as PlusIcon} from '#/components/icons/Plus'
import {Trash_Stroke2_Corner0_Rounded as TrashIcon} from '#/components/icons/Trash'
import {SettingsGear2_Stroke2_Corner0_Rounded as SettingsIcon} from '#/components/icons/SettingsGear2'
import {Shield_Stroke2_Corner0_Rounded as ShieldIcon} from '#/components/icons/Shield'

interface SonetGroupParticipant {
  id: string
  username: string
  displayName?: string
  avatar?: string
  isAdmin: boolean
  isOwner: boolean
  joinedAt: string
  isOnline?: boolean
}

interface SonetGroupChat {
  id: string
  title: string
  description?: string
  avatar?: string
  participants: SonetGroupParticipant[]
  isEncrypted: boolean
  encryptionStatus: 'enabled' | 'disabled' | 'pending'
  createdAt: string
  updatedAt: string
}

interface SonetGroupChatManagerProps {
  group: SonetGroupChat
  currentUserId: string
  onAddParticipant?: (username: string) => Promise<void>
  onRemoveParticipant?: (participantId: string) => Promise<void>
  onUpdateGroupInfo?: (updates: Partial<SonetGroupChat>) => Promise<void>
  onLeaveGroup?: () => Promise<void>
  onDeleteGroup?: () => Promise<void>
}

export function SonetGroupChatManager({
  group,
  currentUserId,
  onAddParticipant,
  onRemoveParticipant,
  onUpdateGroupInfo,
  onLeaveGroup,
  onDeleteGroup,
}: SonetGroupChatManagerProps) {
  const t = useTheme()
  const {_} = useLingui()
  const [newParticipantUsername, setNewParticipantUsername] = useState('')
  const [isAddingParticipant, setIsAddingParticipant] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [editingTitle, setEditingTitle] = useState(group.title)
  const [editingDescription, setEditingDescription] = useState(group.description || '')
  const [isEditing, setIsEditing] = useState(false)

  // Get current user's role
  const currentUser = group.participants.find(p => p.id === currentUserId)
  const isOwner = currentUser?.isOwner || false
  const isAdmin = currentUser?.isAdmin || false
  const canManage = isOwner || isAdmin

  // Username adding participant
  const usernameAddParticipant = useCallback(async () => {
    if (!newParticipantUsername.trim() || !onAddParticipant) return

    setIsAddingParticipant(true)
    try {
      await onAddParticipant(newParticipantUsername.trim())
      setNewParticipantUsername('')
    } catch (error) {
      console.error('Failed to add participant:', error)
    } finally {
      setIsAddingParticipant(false)
    }
  }, [newParticipantUsername, onAddParticipant])

  // Handle removing participant
  const handleRemoveParticipant = useCallback(async (participantId: string) => {
    if (!onRemoveParticipant) return

    try {
      await onRemoveParticipant(participantId)
    } catch (error) {
      console.error('Failed to remove participant:', error)
    }
  }, [onRemoveParticipant])

  // Username updating group info
  const usernameUpdateGroupInfo = useCallback(async () => {
    if (!onUpdateGroupInfo) return

    setIsUpdating(true)
    try {
      await onUpdateGroupInfo({
        title: editingTitle,
        description: editingDescription,
      })
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update group info:', error)
    } finally {
      setIsUpdating(false)
    }
  }, [editingTitle, editingDescription, onUpdateGroupInfo])

  // Username leaving group
  const usernameLeaveGroup = useCallback(async () => {
    if (!onLeaveGroup) return

    try {
      await onLeaveGroup()
    } catch (error) {
      console.error('Failed to leave group:', error)
    }
  }, [onLeaveGroup])

  // Username deleting group
  const usernameDeleteGroup = useCallback(async () => {
    if (!onDeleteGroup) return

    try {
      await onDeleteGroup()
    } catch (error) {
      console.error('Failed to delete group:', error)
    }
  }, [onDeleteGroup])

  return (
    <ScrollView style={[a.flex_1]} contentContainerStyle={[a.gap_md, a.p_md]}>
      {/* Group Header */}
      <View
        style={[
          a.items_center,
          a.gap_sm,
          a.p_md,
          a.rounded_2xl,
          a.border,
          t.atoms.bg_contrast_25,
          t.atoms.border_contrast_25,
        ]}>
        {/* Group Avatar */}
        <View
          style={[
            a.w_20,
            a.h_20,
            a.rounded_full,
            a.overflow_hidden,
            a.border,
            t.atoms.border_contrast_25,
          ]}>
          {group.avatar ? (
            <img
              src={group.avatar}
              alt={group.title}
              style={{width: 80, height: 80}}
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
              <PersonGroupIcon
                size="xl"
                style={[t.atoms.text_contrast_medium]}
              />
            </View>
          )}
        </View>

        {/* Group Info */}
        <View style={[a.items_center, a.gap_xs]}>
          <Text style={[a.text_xl, a.font_bold, t.atoms.text]}>
            {group.title}
          </Text>
          {group.description && (
            <Text
              style={[
                a.text_sm,
                t.atoms.text_contrast_medium,
                a.text_center,
              ]}>
              {group.description}
            </Text>
          )}
          <Text
            style={[
              a.text_xs,
              t.atoms.text_contrast_medium,
            ]}>
            {group.participants.length} participants
          </Text>
        </View>

        {/* Encryption Status */}
        <View style={[a.flex_row, a.items_center, a.gap_xs]}>
          <ShieldIcon
            size="sm"
            style={[
              group.isEncrypted ? t.atoms.text_positive : t.atoms.text_contrast_medium,
            ]}
          />
          <Text
            style={[
              a.text_xs,
              group.isEncrypted ? t.atoms.text_positive : t.atoms.text_contrast_medium,
            ]}>
            {group.isEncrypted ? 'End-to-end encrypted' : 'Not encrypted'}
          </Text>
        </View>
      </View>

      {/* Group Management */}
      {canManage && (
        <View
          style={[
            a.gap_md,
            a.p_md,
            a.rounded_2xl,
            a.border,
            t.atoms.bg_contrast_25,
            t.atoms.border_contrast_25,
          ]}>
          <Text style={[a.text_lg, a.font_bold, t.atoms.text]}>
            <Trans>Group Management</Trans>
          </Text>

          {/* Add Participant */}
          <View style={[a.gap_sm]}>
            <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
              <Trans>Add Participant</Trans>
            </Text>
            <View style={[a.flex_row, a.gap_sm]}>
              <TextInput
                value={newParticipantUsername}
                onChangeText={setNewParticipantUsername}
                placeholder={_('Enter username')}
                placeholderTextColor={t.atoms.text_contrast_medium.color}
                style={[
                  a.flex_1,
                  a.px_md,
                  a.py_sm,
                  a.rounded_2xl,
                  a.border,
                  t.atoms.bg,
                  t.atoms.text,
                  t.atoms.border_contrast_25,
                ]}
              />
              <Button
                variant="solid"
                color="primary"
                size="small"
                onPress={usernameAddParticipant}
                disabled={!newParticipantUsername.trim() || isAddingParticipant}>
                <ButtonIcon icon={PlusIcon} />
                <ButtonText>
                  <Trans>Add</Trans>
                </ButtonText>
              </Button>
            </View>
          </View>

          {/* Edit Group Info */}
          <View style={[a.gap_sm]}>
            <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
              <Trans>Group Information</Trans>
            </Text>
            {isEditing ? (
              <View style={[a.gap_sm]}>
                <TextInput
                  value={editingTitle}
                  onChangeText={setEditingTitle}
                  placeholder={_('Group title')}
                  placeholderTextColor={t.atoms.text_contrast_medium.color}
                  style={[
                    a.px_md,
                    a.py_sm,
                    a.rounded_2xl,
                    a.border,
                    t.atoms.bg,
                    t.atoms.text,
                    t.atoms.border_contrast_25,
                  ]}
                />
                <TextInput
                  value={editingDescription}
                  onChangeText={setEditingDescription}
                  placeholder={_('Group description (optional)')}
                  placeholderTextColor={t.atoms.text_contrast_medium.color}
                  multiline
                  style={[
                    a.px_md,
                    a.py_sm,
                    a.rounded_2xl,
                    a.border,
                    t.atoms.bg,
                    t.atoms.text,
                    t.atoms.border_contrast_25,
                  ]}
                />
                <View style={[a.flex_row, a.gap_sm]}>
                  <Button
                    variant="ghost"
                    color="secondary"
                    size="small"
                    onPress={() => setIsEditing(false)}
                    style={[a.flex_1]}>
                    <ButtonText>
                      <Trans>Cancel</Trans>
                    </ButtonText>
                  </Button>
                  <Button
                    variant="solid"
                    color="primary"
                    size="small"
                    onPress={usernameUpdateGroupInfo}
                    disabled={isUpdating}
                    style={[a.flex_1]}>
                    <ButtonText>
                      <Trans>Save</Trans>
                    </ButtonText>
                  </Button>
                </View>
              </View>
            ) : (
              <Button
                variant="ghost"
                color="secondary"
                size="small"
                onPress={() => setIsEditing(true)}>
                <ButtonIcon icon={SettingsIcon} />
                <ButtonText>
                  <Trans>Edit</Trans>
                </ButtonText>
              </Button>
            )}
          </View>
        </View>
      )}

      {/* Participants List */}
      <View
        style={[
          a.gap_md,
          a.p_md,
          a.rounded_2xl,
          a.border,
          t.atoms.bg_contrast_25,
          t.atoms.border_contrast_25,
        ]}>
        <Text style={[a.text_lg, a.font_bold, t.atoms.text]}>
          <Trans>Participants</Trans>
        </Text>

        <View style={[a.gap_sm]}>
          {group.participants.map(participant => (
            <View
              key={participant.id}
              style={[
                a.flex_row,
                a.items_center,
                a.justify_between,
                a.p_sm,
                a.rounded_2xl,
                t.atoms.bg,
              ]}>
              <View style={[a.flex_row, a.items_center, a.gap_sm, a.flex_1]}>
                <View
                  style={[
                    a.w_8,
                    a.h_8,
                    a.rounded_full,
                    a.overflow_hidden,
                    a.border,
                    t.atoms.border_contrast_25,
                  ]}>
                  {participant.avatar ? (
                    <img
                      src={participant.avatar}
                      alt={participant.displayName || participant.username}
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

                <View style={[a.flex_1, a.min_w_0]}>
                  <Text
                    style={[
                      a.text_sm,
                      a.font_medium,
                      t.atoms.text,
                    ]}
                    numberOfLines={1}>
                    {participant.displayName || participant.username}
                  </Text>
                  <Text
                    style={[
                      a.text_xs,
                      t.atoms.text_contrast_medium,
                    ]}>
                    @{participant.username}
                  </Text>
                </View>
              </View>

              <View style={[a.flex_row, a.items_center, a.gap_xs]}>
                {/* Role badges */}
                {participant.isOwner && (
                  <View
                    style={[
                      a.px_xs,
                      a.py_1,
                      a.rounded_sm,
                      t.atoms.bg_primary_25,
                    ]}>
                    <Text style={[a.text_xs, t.atoms.text_primary]}>
                      <Trans>Owner</Trans>
                    </Text>
                  </View>
                )}
                {participant.isAdmin && !participant.isOwner && (
                  <View
                    style={[
                      a.px_xs,
                      a.py_1,
                      a.rounded_sm,
                      t.atoms.bg_warning_25,
                    ]}>
                    <Text style={[a.text_xs, t.atoms.text_warning]}>
                      <Trans>Admin</Trans>
                    </Text>
                  </View>
                )}

                {/* Online status */}
                {participant.isOnline && (
                  <View
                    style={[
                      a.w_2,
                      a.h_2,
                      a.rounded_full,
                      t.atoms.bg_positive,
                    ]} />
                )}

                {/* Remove button (for admins/owner) */}
                {canManage && participant.id !== currentUserId && (
                  <Button
                    variant="ghost"
                    color="negative"
                    size="small"
                    onPress={() => handleRemoveParticipant(participant.id)}>
                    <ButtonIcon icon={TrashIcon} />
                  </Button>
                )}
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Group Actions */}
      <View style={[a.gap_sm]}>
        {isOwner ? (
          <Button
            variant="solid"
            color="negative"
            size="lg"
            onPress={usernameDeleteGroup}>
            <ButtonText>
              <Trans>Delete Group</Trans>
            </ButtonText>
          </Button>
        ) : (
          <Button
            variant="solid"
            color="secondary"
            size="lg"
            onPress={usernameLeaveGroup}>
            <ButtonText>
              <Trans>Leave Group</Trans>
            </ButtonText>
          </Button>
        )}
      </View>
    </ScrollView>
  )
}