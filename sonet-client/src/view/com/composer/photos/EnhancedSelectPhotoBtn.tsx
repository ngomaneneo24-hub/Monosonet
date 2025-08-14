import React, {useCallback, useState} from 'react'
import {View, StyleSheet, Alert} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {usePhotoLibraryPermission} from '#/lib/hooks/usePermissions'
import {openPicker} from '#/lib/media/picker'
import {isNative} from '#/platform/detection'
import {ComposerImage, createComposerImage} from '#/state/gallery'
import {atoms as a, useTheme} from '#/alf'
import {Button} from '#/components/Button'
import {useSheetWrapper} from '#/components/Dialog/sheet-wrapper'
import {Image_Stroke2_Corner0_Rounded as Image} from '#/components/icons/Image'
import {MAX_IMAGES} from '../../state/composer'

type Props = {
  size: number
  disabled?: boolean
  onAdd: (next: ComposerImage[]) => void
  onShowMediaManager?: () => void
}

export function EnhancedSelectPhotoBtn({size, disabled, onAdd, onShowMediaManager}: Props) {
  const {_} = useLingui()
  const {requestPhotoAccessIfNeeded} = usePhotoLibraryPermission()
  const t = useTheme()
  const sheetWrapper = useSheetWrapper()
  const [isSelecting, setIsSelecting] = useState(false)
  
  // Check if we can add more media
  const canAddMore = size < MAX_IMAGES
  const remainingSlots = MAX_IMAGES - size
  
  const onPressSelectPhotos = useCallback(async () => {
    if (!canAddMore) {
      Alert.alert(
        _(msg`Media Limit Reached`),
        _(msg`You can upload up to ${MAX_IMAGES} media items. You currently have ${size}.`),
        [
          {text: 'OK'},
          {text: 'Manage Media', onPress: onShowMediaManager},
        ]
      )
      return
    }
    
    if (isNative && !(await requestPhotoAccessIfNeeded())) {
      return
    }
    
    setIsSelecting(true)
    
    try {
      const images = await sheetWrapper(
        openPicker({
          selectionLimit: remainingSlots,
          allowsMultipleSelection: true,
          mediaTypes: 'All', // Allow both images and videos
        }),
      )
      
      if (images && images.length > 0) {
        const results = await Promise.all(
          images.map(img => createComposerImage(img)),
        )
        
        onAdd(results)
        
        // Show success message for multiple images
        if (results.length > 1) {
          Alert.alert(
            _(msg`Media Added`),
            _(msg`Successfully added ${results.length} media items. You can now reorder them or add more.`),
            [{text: 'OK'}]
          )
        }
      }
    } catch (error) {
      console.error('Error selecting photos:', error)
      Alert.alert(
        _(msg`Error`),
        _(msg`Failed to select media. Please try again.`),
        [{text: 'OK'}]
      )
    } finally {
      setIsSelecting(false)
    }
  }, [requestPhotoAccessIfNeeded, size, onAdd, sheetWrapper, canAddMore, remainingSlots, onShowMediaManager, _])
  
  const onPressManageMedia = useCallback(() => {
    if (onShowMediaManager) {
      onShowMediaManager()
    } else {
      Alert.alert(
        _(msg`Media Management`),
        _(msg`You have ${size} media items. You can add up to ${MAX_IMAGES} total.`),
        [{text: 'OK'}]
      )
    }
  }, [onShowMediaManager, size])
  
  return (
    <View style={styles.container}>
      {/* Main select button */}
      <Button
        testID="openGalleryBtn"
        onPress={onPressSelectPhotos}
        label={_(msg`Add Media`)}
        accessibilityHint={_(msg`Opens device photo gallery to select up to ${remainingSlots} more media items`)}
        style={[a.p_sm, styles.mainButton]}
        variant="ghost"
        shape="round"
        color="primary"
        disabled={disabled || !canAddMore || isSelecting}>
        <Image 
          size="lg" 
          style={[
            disabled && t.atoms.text_contrast_low,
            isSelecting && {opacity: 0.6}
          ]} 
        />
      </Button>
      
      {/* Media count indicator */}
      {size > 0 && (
        <View style={[styles.countIndicator, {backgroundColor: t.atoms.bg_contrast_25.color}]}>
          <Trans>{size}/{MAX_IMAGES}</Trans>
        </View>
      )}
      
      {/* Manage media button (when media exists) */}
      {size > 0 && onShowMediaManager && (
        <Button
          onPress={onPressManageMedia}
          label={_(msg`Manage Media`)}
          accessibilityHint={_(msg`Opens media manager to reorder or remove media items`)}
          style={[a.p_xs, styles.manageButton]}
          variant="ghost"
          shape="round"
          color="secondary"
          size="small">
          <Trans>Manage</Trans>
        </Button>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mainButton: {
    minWidth: 44,
    minHeight: 44,
  },
  countIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 32,
    alignItems: 'center',
  },
  manageButton: {
    minWidth: 60,
    minHeight: 32,
  },
})