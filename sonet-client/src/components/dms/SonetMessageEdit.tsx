import React, {useState, useRef, useEffect} from 'react'
import {View, TextInput, TouchableOpacity, Alert} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {Check_Stroke2_Corner0_Rounded as CheckIcon} from '#/components/icons/Check'
import {X_Stroke2_Corner0_Rounded as CloseIcon} from '#/components/icons/Times'

interface SonetMessageEditProps {
  messageId: string
  initialContent: string
  onSave: (messageId: string, newContent: string) => Promise<void>
  onCancel: () => void
  isVisible: boolean
}

export function SonetMessageEdit({
  messageId,
  initialContent,
  onSave,
  onCancel,
  isVisible,
}: SonetMessageEditProps) {
  const t = useTheme()
  const {_} = useLingui()
  const [content, setContent] = useState(initialContent)
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<TextInput>(null)

  useEffect(() => {
    if (isVisible) {
      setContent(initialContent)
      // Focus input after a short delay to ensure it's rendered
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.setSelection(initialContent.length, initialContent.length)
      }, 100)
    }
  }, [isVisible, initialContent])

  const handleSave = async () => {
    if (!content.trim()) {
      Alert.alert(_('Error'), _('Message cannot be empty'))
      return
    }

    if (content === initialContent) {
      onCancel()
      return
    }

    setIsSaving(true)
    try {
      await onSave(messageId, content.trim())
    } catch (error) {
      console.error('Failed to edit message:', error)
      Alert.alert(_('Error'), _('Failed to edit message. Please try again.'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setContent(initialContent)
    onCancel()
  }

  if (!isVisible) return null

  return (
    <View style={[
      a.px_md,
      a.py_sm,
      a.mb_sm,
      a.rounded_2xl,
      a.border,
      t.atoms.bg_contrast_25,
      t.atoms.border_primary,
    ]}>
      {/* Edit Header */}
      <View style={[a.flex_row, a.items_center, a.justify_between, a.mb_sm]}>
        <Text style={[a.text_xs, t.atoms.text_contrast_medium, a.font_bold]}>
          <Trans>Editing message</Trans>
        </Text>
        <View style={[a.flex_row, a.gap_xs]}>
          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving || !content.trim() || content === initialContent}
            style={[
              a.p_1,
              a.rounded_sm,
              (isSaving || !content.trim() || content === initialContent)
                ? t.atoms.bg_contrast_50
                : t.atoms.bg_positive,
            ]}>
            <CheckIcon
              size="xs"
              style={[
                (isSaving || !content.trim() || content === initialContent)
                  ? t.atoms.text_contrast_50
                  : t.atoms.text_on_positive,
              ]}
            />
          </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity
            onPress={handleCancel}
            disabled={isSaving}
            style={[
              a.p_1,
              a.rounded_sm,
              t.atoms.bg_contrast_25,
            ]}>
            <CloseIcon
              size="xs"
              style={[t.atoms.text_contrast_medium]}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Edit Input */}
      <TextInput
        ref={inputRef}
        value={content}
        onChangeText={setContent}
        placeholder={_('Edit your message...')}
        placeholderTextColor={t.atoms.text_contrast_medium.color}
        multiline
        maxLength={1000}
        editable={!isSaving}
        style={[
          a.px_md,
          a.py_sm,
          a.rounded_xl,
          a.border,
          a.min_h_10,
          a.max_h_32,
          t.atoms.bg,
          t.atoms.text,
          t.atoms.border_contrast_25,
        ]}
      />

      {/* Character Count */}
      <View style={[a.flex_row, a.items_center, a.justify_between, a.mt_xs]}>
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          {content.length}/1000
        </Text>
        {content !== initialContent && (
          <Text style={[a.text_xs, t.atoms.text_warning]}>
            <Trans>Message modified</Trans>
          </Text>
        )}
      </View>
    </View>
  )
}