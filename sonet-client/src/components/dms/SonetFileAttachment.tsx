import React, {useCallback, useState} from 'react'
import {View, TouchableOpacity, TextInput} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {Text} from '#/components/Typography'
import {Download_Stroke2_Corner0_Rounded as DownloadIcon} from '#/components/icons/Download'
import {Shield_Stroke2_Corner0_Rounded as ShieldIcon} from '#/components/icons/Shield'
import {Warning_Stroke2_Corner0_Rounded as WarningIcon} from '#/components/icons/Warning'
import {CircleCheck_Stroke2_Corner0_Rounded as CheckIcon} from '#/components/icons/CircleCheck'
import {CircleX_Stroke2_Corner0_Rounded as ErrorIcon} from '#/components/icons/CircleX'
import {PaperPlane_Stroke2_Corner0_Rounded as SendIcon} from '#/components/icons/PaperPlane'

interface SonetFileAttachment {
  id: string
  filename: string
  size: number
  type: string
  url?: string
  isEncrypted: boolean
  encryptionStatus: 'encrypted' | 'decrypted' | 'failed' | 'pending'
  uploadProgress?: number
  error?: string
}

interface SonetFileAttachmentProps {
  attachment: SonetFileAttachment
  onDownload?: (attachment: SonetFileAttachment) => void
  onRetry?: (attachment: SonetFileAttachment) => void
  onDelete?: (attachment: SonetFileAttachment) => void
  isOwnMessage?: boolean
}

export function SonetFileAttachment({
  attachment,
  onDownload,
  onRetry,
  onDelete,
  isOwnMessage = false,
}: SonetFileAttachmentProps) {
  const t = useTheme()
  const {_} = useLingui()
  const [isExpanded, setIsExpanded] = useState(false)

  // Format file size
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }, [])

  // Get file type icon
  const getFileTypeIcon = useCallback((type: string) => {
    if (type.startsWith('image/')) return '🖼️'
    if (type.startsWith('video/')) return '🎥'
    if (type.startsWith('audio/')) return '🎵'
    if (type.includes('pdf')) return '📄'
    if (type.includes('document') || type.includes('text')) return '📝'
    return '📎'
  }, [])

  // Get encryption status icon
  const getEncryptionIcon = useCallback(() => {
    switch (attachment.encryptionStatus) {
      case 'encrypted':
        return <ShieldIcon size="sm" style={[t.atoms.text_positive]} />
      case 'decrypted':
        return <CheckIcon size="sm" style={[t.atoms.text_positive]} />
      case 'failed':
        return <ErrorIcon size="sm" style={[t.atoms.text_negative]} />
      case 'pending':
        return <WarningIcon size="sm" style={[t.atoms.text_warning]} />
      default:
        return <ShieldIcon size="sm" style={[t.atoms.text_contrast_medium]} />
    }
  }, [attachment.encryptionStatus, t])

  // Get encryption status text
  const getEncryptionText = useCallback(() => {
    switch (attachment.encryptionStatus) {
      case 'encrypted':
        return _('Encrypted')
      case 'decrypted':
        return _('Decrypted')
      case 'failed':
        return _('Decryption failed')
      case 'pending':
        return _('Decrypting...')
      default:
        return _('Unknown')
    }
  }, [attachment.encryptionStatus, _])

  // Handle download
  const handleDownload = useCallback(() => {
    if (onDownload) {
      onDownload(attachment)
    }
  }, [attachment, onDownload])

  // Handle retry
  const handleRetry = useCallback(() => {
    if (onRetry) {
      onRetry(attachment)
    }
  }, [attachment, onRetry])

  // Handle delete
  const handleDelete = useCallback(() => {
    if (onDelete) {
      onDelete(attachment)
    }
  }, [attachment, onDelete])

  // Toggle expanded view
  const toggleExpanded = useCallback(() => {
    setIsExpanded(!isExpanded)
  }, [isExpanded])

  return (
    <View
      style={[
        a.border,
        a.rounded_2xl,
        a.p_md,
        a.gap_sm,
        t.atoms.bg_contrast_25,
        t.atoms.border_contrast_25,
      ]}>
      {/* File Header */}
      <View style={[a.flex_row, a.items_center, a.justify_between]}>
        <View style={[a.flex_row, a.items_center, a.gap_sm, a.flex_1]}>
          <Text style={[a.text_2xl]}>
            {getFileTypeIcon(attachment.type)}
          </Text>
          <View style={[a.flex_1, a.min_w_0]}>
            <Text
              style={[
                a.text_sm,
                a.font_bold,
                t.atoms.text,
              ]}
              numberOfLines={1}>
              {attachment.filename}
            </Text>
            <Text
              style={[
                a.text_xs,
                t.atoms.text_contrast_medium,
              ]}>
              {formatFileSize(attachment.size)}
            </Text>
          </View>
        </View>

        {/* Encryption Status */}
        <View style={[a.flex_row, a.items_center, a.gap_xs]}>
          {getEncryptionIcon()}
          <TouchableOpacity onPress={toggleExpanded}>
            <Text
              style={[
                a.text_xs,
                t.atoms.text_contrast_medium,
              ]}>
              {isExpanded ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Expanded Content */}
      {isExpanded && (
        <View style={[a.gap_sm]}>
          {/* File Type */}
          <View style={[a.flex_row, a.items_center, a.gap_xs]}>
            <Text
              style={[
                a.text_xs,
                t.atoms.text_contrast_medium,
              ]}>
              <Trans>Type:</Trans>
            </Text>
            <Text
              style={[
                a.text_xs,
                t.atoms.text,
              ]}>
              {attachment.type}
            </Text>
          </View>

          {/* Encryption Details */}
          <View style={[a.flex_row, a.items_center, a.gap_xs]}>
            <Text
              style={[
                a.text_xs,
                t.atoms.text_contrast_medium,
              ]}>
              <Trans>Status:</Trans>
            </Text>
            {getEncryptionIcon()}
            <Text
              style={[
                a.text_xs,
                t.atoms.text,
              ]}>
              {getEncryptionText()}
            </Text>
          </View>

          {/* Upload Progress */}
          {attachment.uploadProgress !== undefined && (
            <View style={[a.gap_xs]}>
              <View style={[a.flex_row, a.items_center, a.justify_between]}>
                <Text
                  style={[
                    a.text_xs,
                    t.atoms.text_contrast_medium,
                  ]}>
                  <Trans>Uploading...</Trans>
                </Text>
                <Text
                  style={[
                    a.text_xs,
                    t.atoms.text_contrast_medium,
                  ]}>
                  {Math.round(attachment.uploadProgress)}%
                </Text>
              </View>
              <View
                style={[
                  a.h_1,
                  a.rounded_full,
                  a.bg_contrast_50,
                  a.overflow_hidden,
                ]}>
                <View
                  style={[
                    a.h_full,
                    a.rounded_full,
                    t.atoms.bg_primary,
                    {width: `${attachment.uploadProgress}%`},
                  ]} />
              </View>
            </View>
          )}

          {/* Error Message */}
          {attachment.error && (
            <View
              style={[
                a.px_sm,
                a.py_xs,
                a.rounded_sm,
                t.atoms.bg_negative_25,
              ]}>
              <Text
                style={[
                  a.text_xs,
                  t.atoms.text_negative,
                ]}>
                {attachment.error}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={[a.flex_row, a.gap_sm]}>
            {attachment.url && (
              <Button
                variant="ghost"
                color="secondary"
                size="small"
                onPress={handleDownload}
                style={[a.flex_1]}>
                <ButtonIcon icon={DownloadIcon} />
                <ButtonText>
                  <Trans>Download</Trans>
                </ButtonText>
              </Button>
            )}

            {attachment.error && onRetry && (
              <Button
                variant="ghost"
                color="secondary"
                size="small"
                onPress={handleRetry}
                style={[a.flex_1]}>
                <ButtonIcon icon={SendIcon} />
                <ButtonText>
                  <Trans>Retry</Trans>
                </ButtonText>
              </Button>
            )}

            {isOwnMessage && onDelete && (
              <Button
                variant="ghost"
                color="negative"
                size="small"
                onPress={handleDelete}
                style={[a.flex_1]}>
                <ButtonText>
                  <Trans>Delete</Trans>
                </ButtonText>
              </Button>
            )}
          </View>
        </View>
      )}
    </View>
  )
}