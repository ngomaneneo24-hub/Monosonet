import React, {useCallback, useState, useMemo} from 'react'
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  Alert,
  Platform,
  Dimensions,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import {Image} from 'expo-image'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {Text as TypographyText} from '#/components/Typography'
import {Camera_Stroke2_Corner0_Rounded} from '#/components/icons/Camera'
import {type SonetMedia} from '#/types/sonet'

const {width: screenWidth} = Dimensions.get('window')
const MAX_IMAGES = 10
const MAX_IMAGE_WIDTH = screenWidth - 80
const MAX_IMAGE_HEIGHT = (MAX_IMAGE_WIDTH * 9) / 16 // 16:9 aspect ratio

interface EnhancedMediaUploadProps {
  onMediaChange?: (media: SonetMedia[]) => void
  initialMedia?: SonetMedia[]
  maxImages?: number
  disabled?: boolean
}

export function EnhancedMediaUpload({
  onMediaChange,
  initialMedia = [],
  maxImages = MAX_IMAGES,
  disabled = false,
}: EnhancedMediaUploadProps) {
  const t = useTheme()
  const {_} = useLingui()
  
  const [media, setMedia] = useState<SonetMedia[]>(initialMedia)
  const [isUploading, setIsUploading] = useState(false)

  const remainingSlots = maxImages - media.length
  const canAddMore = remainingSlots > 0

  const requestPermissions = useCallback(async () => {
    if (Platform.OS === 'web') return true
    
    const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant permission to access your photo library to upload images.',
        [{text: 'OK'}]
      )
      return false
    }
    return true
  }, [])

  const handleImagePicker = useCallback(async () => {
    if (!canAddMore || disabled) return
    
    const hasPermission = await requestPermissions()
    if (!hasPermission) return

    try {
      setIsUploading(true)
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        quality: 0.8,
        aspect: [16, 9],
        allowsEditing: true,
      })

      if (!result.canceled && result.assets) {
        const newMedia: SonetMedia[] = result.assets.map((asset, index) => ({
          id: `temp_${Date.now()}_${index}`,
          type: 'image' as const,
          url: asset.uri,
          alt: asset.fileName || `Image ${media.length + index + 1}`,
          width: asset.width,
          height: asset.height,
        }))

        const updatedMedia = [...media, ...newMedia]
        setMedia(updatedMedia)
        onMediaChange?.(updatedMedia)
      }
    } catch (error) {
      console.error('Image picker error:', error)
      Alert.alert('Error', 'Failed to pick images. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }, [canAddMore, disabled, requestPermissions, remainingSlots, media, onMediaChange])

  const handleCameraCapture = useCallback(async () => {
    if (!canAddMore || disabled) return
    
    const {status} = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert(
        'Camera Permission Required',
        'Please grant permission to access your camera to take photos.',
        [{text: 'OK'}]
      )
      return
    }

    try {
      setIsUploading(true)
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        aspect: [16, 9],
        allowsEditing: true,
      })

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0]
        const newMedia: SonetMedia = {
          id: `temp_${Date.now()}`,
          type: 'image',
          url: asset.uri,
          alt: 'Camera photo',
          width: asset.width,
          height: asset.height,
        }

        const updatedMedia = [...media, newMedia]
        setMedia(updatedMedia)
        onMediaChange?.(updatedMedia)
      }
    } catch (error) {
      console.error('Camera error:', error)
      Alert.alert('Error', 'Failed to capture image. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }, [canAddMore, disabled, media, onMediaChange])

  const removeMedia = useCallback((index: number) => {
    const updatedMedia = media.filter((_, i) => i !== index)
    setMedia(updatedMedia)
    onMediaChange?.(updatedMedia)
  }, [media, onMediaChange])

  const reorderMedia = useCallback((fromIndex: number, toIndex: number) => {
    const updatedMedia = [...media]
    const [removed] = updatedMedia.splice(fromIndex, 1)
    updatedMedia.splice(toIndex, 0, removed)
    setMedia(updatedMedia)
    onMediaChange?.(updatedMedia)
  }, [media, onMediaChange])

  const renderMediaItem = useCallback((item: SonetMedia, index: number) => {
    const aspectRatio = item.width && item.height ? item.width / item.height : 16 / 9
    const imageHeight = Math.min(MAX_IMAGE_HEIGHT, MAX_IMAGE_WIDTH / aspectRatio)
    
    return (
      <View key={item.id} style={[styles.mediaItem, {height: imageHeight}]}>
        <Image
          source={{uri: item.url}}
          style={[styles.mediaImage, {height: imageHeight}]}
          contentFit="cover"
          transition={200}
        />
        <Pressable
          style={styles.removeButton}
          onPress={() => removeMedia(index)}
          accessibilityRole="button"
          accessibilityLabel="Remove image"
        >
          <View style={styles.removeButtonIcon}>
            <Text style={styles.removeButtonText}>×</Text>
          </View>
        </Pressable>
        {index > 0 && (
          <Pressable
            style={styles.moveLeftButton}
            onPress={() => reorderMedia(index, index - 1)}
            accessibilityRole="button"
            accessibilityLabel="Move image left"
          >
            <Text style={styles.moveButtonText}>‹</Text>
          </Pressable>
        )}
        {index < media.length - 1 && (
          <Pressable
            style={styles.moveRightButton}
            onPress={() => reorderMedia(index, index + 1)}
            accessibilityRole="button"
            accessibilityLabel="Move image right"
          >
            <Text style={styles.moveButtonText}>›</Text>
          </Pressable>
        )}
      </View>
    )
  }, [removeMedia, reorderMedia, media.length])

  const renderAddButton = useCallback(() => {
    if (!canAddMore) return null

    return (
      <Pressable
        style={[styles.addButton, disabled && styles.addButtonDisabled]}
        onPress={handleImagePicker}
        disabled={disabled || isUploading}
        accessibilityRole="button"
        accessibilityLabel="Add images"
      >
        <Camera_Stroke2_Corner0_Rounded
          width={24}
          height={24}
          style={[styles.addButtonIcon, t.atoms.text_contrast_medium]}
        />
        <TypographyText style={[styles.addButtonText, t.atoms.text_contrast_medium]}>
          {isUploading ? 'Uploading...' : `Add ${remainingSlots} more`}
        </TypographyText>
      </Pressable>
    )
  }, [canAddMore, disabled, isUploading, remainingSlots, t.atoms.text_contrast_medium])

  const renderCameraButton = useCallback(() => {
    if (!canAddMore || disabled) return null

    return (
      <Pressable
        style={[styles.cameraButton, disabled && styles.cameraButtonDisabled]}
        onPress={handleCameraCapture}
        disabled={disabled || isUploading}
        accessibilityRole="button"
        accessibilityLabel="Take photo"
      >
        <Camera_Stroke2_Corner0_Rounded
          width={20}
          height={20}
          style={[styles.cameraButtonIcon, t.atoms.text_contrast_medium]}
        />
      </Pressable>
    )
  }, [canAddMore, disabled, isUploading, t.atoms.text_contrast_medium])

  if (media.length === 0 && !canAddMore) return null

  return (
    <View style={styles.container}>
      {/* Media Grid */}
      {media.length > 0 && (
        <View style={styles.mediaGrid}>
          {media.map(renderMediaItem)}
        </View>
      )}
      
      {/* Add Button Row */}
      {canAddMore && (
        <View style={styles.addButtonRow}>
          {renderAddButton()}
          {renderCameraButton()}
        </View>
      )}
      
      {/* Media Count */}
      {media.length > 0 && (
        <View style={styles.mediaCount}>
          <TypographyText style={[styles.mediaCountText, t.atoms.text_contrast_medium]}>
            {media.length} of {maxImages} images
          </TypographyText>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  mediaItem: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  mediaImage: {
    width: '100%',
    borderRadius: 12,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  moveLeftButton: {
    position: 'absolute',
    top: '50%',
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{translateY: -12}],
  },
  moveRightButton: {
    position: 'absolute',
    top: '50%',
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{translateY: -12}],
  },
  moveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  addButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      ':hover': {
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonIcon: {
    // Icon styling
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  cameraButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      ':hover': {
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  cameraButtonDisabled: {
    opacity: 0.5,
  },
  cameraButtonIcon: {
    // Icon styling
  },
  mediaCount: {
    alignItems: 'center',
  },
  mediaCountText: {
    fontSize: 12,
    lineHeight: 16,
  },
})