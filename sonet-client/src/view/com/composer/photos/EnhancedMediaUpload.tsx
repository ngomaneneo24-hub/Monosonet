import React, {useState, useCallback, useRef} from 'react'
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  Text,
  Dimensions,
} from 'react-native'
import {Image} from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome'
import {faPlus, faTrash, faArrowsAlt, faEye} from '@fortawesome/free-solid-svg-icons'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {Text as TypographyText} from '#/components/Typography'
import {Button} from '#/components/Button'
import {MAX_IMAGES} from '../../state/composer'

const {width: SCREEN_WIDTH} = Dimensions.get('window')
const PREVIEW_SIZE = (SCREEN_WIDTH - 48) / 3 // 3 columns with gaps

interface MediaItem {
  id: string
  uri: string
  type: 'image' | 'video'
  filename: string
  mimeType: string
  size: number
  width?: number
  height?: number
  alt?: string
}

interface EnhancedMediaUploadProps {
  media: MediaItem[]
  onMediaChange: (media: MediaItem[]) => void
  onMediaRemove: (id: string) => void
  onMediaReorder: (fromIndex: number, toIndex: number) => void
  maxMedia?: number
  style?: any
}

export function EnhancedMediaUpload({
  media,
  onMediaChange,
  onMediaRemove,
  onMediaReorder,
  maxMedia = MAX_IMAGES,
  style,
}: EnhancedMediaUploadProps) {
  const t = useTheme()
  const {_} = useLingui()
  const [isDragging, setIsDragging] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const scrollViewRef = useRef<ScrollView>(null)
  
  // Check if we can add more media
  const canAddMore = media.length < maxMedia
  
  // Handle media selection
  const handleSelectMedia = useCallback(async () => {
    if (!canAddMore) {
      Alert.alert(
        _(msg`Media Limit Reached`),
        _(msg`You can upload up to ${maxMedia} media items.`),
        [{text: 'OK'}]
      )
      return
    }
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        selectionLimit: maxMedia - media.length,
        quality: 0.8,
        allowsEditing: false,
      })
      
      if (!result.canceled && result.assets) {
        const newMedia: MediaItem[] = result.assets.map((asset, index) => ({
          id: `media_${Date.now()}_${index}`,
          uri: asset.uri,
          type: asset.type === 'video' ? 'video' : 'image',
          filename: asset.fileName || `media_${index}`,
          mimeType: asset.mimeType || 'image/jpeg',
          size: asset.fileSize || 0,
          width: asset.width,
          height: asset.height,
        }))
        
        onMediaChange([...media, ...newMedia])
      }
    } catch (error) {
      console.error('Error selecting media:', error)
      Alert.alert(
        _(msg`Error`),
        _(msg`Failed to select media. Please try again.`),
        [{text: 'OK'}]
      )
    }
  }, [canAddMore, maxMedia, media.length, onMediaChange, _])
  
  // Handle media removal
  const handleRemoveMedia = useCallback((id: string) => {
    Alert.alert(
      _(msg`Remove Media`),
      _(msg`Are you sure you want to remove this media item?`),
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Remove', style: 'destructive', onPress: () => onMediaRemove(id)},
      ]
    )
  }, [onMediaRemove, _])
  
  // Handle drag start
  const handleDragStart = useCallback((index: number) => {
    setIsDragging(true)
    setDragIndex(index)
  }, [])
  
  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
    setDragIndex(null)
  }, [])
  
  // Handle drop
  const handleDrop = useCallback((dropIndex: number) => {
    if (dragIndex !== null && dragIndex !== dropIndex) {
      onMediaReorder(dragIndex, dropIndex)
    }
    handleDragEnd()
  }, [dragIndex, onMediaReorder, handleDragEnd])
  
  // Render media preview
  const renderMediaPreview = (item: MediaItem, index: number) => {
    const isDragging = dragIndex === index
    
    return (
      <View
        key={item.id}
        style={[
          styles.mediaPreview,
          isDragging && styles.mediaPreviewDragging,
        ]}
        onTouchStart={() => handleDragStart(index)}
        onTouchEnd={() => handleDrop(index)}>
        
        {/* Media content */}
        <Image
          source={{uri: item.uri}}
          style={styles.mediaImage}
          contentFit="cover"
        />
        
        {/* Media type indicator */}
        {item.type === 'video' && (
          <View style={styles.videoIndicator}>
            <FontAwesomeIcon icon={faEye} size={12} color="white" />
          </View>
        )}
        
        {/* Remove button */}
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveMedia(item.id)}>
          <FontAwesomeIcon icon={faTrash} size={12} color="white" />
        </TouchableOpacity>
        
        {/* Drag handle */}
        <TouchableOpacity
          style={styles.dragHandle}
          onPress={() => handleDragStart(index)}>
          <FontAwesomeIcon icon={faArrowsAlt} size={12} color="white" />
        </TouchableOpacity>
        
        {/* Alt text indicator */}
        {item.alt && (
          <View style={styles.altIndicator}>
            <Text style={styles.altIndicatorText}>ALT</Text>
          </View>
        )}
      </View>
    )
  }
  
  // Render add media button
  const renderAddButton = () => {
    if (!canAddMore) return null
    
    return (
      <TouchableOpacity
        style={[styles.mediaPreview, styles.addButton]}
        onPress={handleSelectMedia}>
        <FontAwesomeIcon icon={faPlus} size={24} color={t.atoms.text_contrast_medium.color} />
        <TypographyText style={[styles.addButtonText, {color: t.atoms.text_contrast_medium.color}]}>
          <Trans>Add Media</Trans>
        </TypographyText>
      </TouchableOpacity>
    )
  }
  
  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <TypographyText style={[styles.headerTitle, {color: t.atoms.text.color}]}>
          <Trans>Media ({media.length}/{maxMedia})</Trans>
        </TypographyText>
        
        {media.length > 0 && (
          <Button
            size="small"
            variant="outline"
            onPress={() => onMediaChange([])}>
            <Trans>Clear All</Trans>
          </Button>
        )}
      </View>
      
      {/* Media grid */}
      <ScrollView
        ref={scrollViewRef}
        horizontal={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.mediaGrid}>
        
        {/* Existing media */}
        {media.map((item, index) => renderMediaPreview(item, index))}
        
        {/* Add button */}
        {renderAddButton()}
      </ScrollView>
      
      {/* Media info */}
      {media.length > 0 && (
        <View style={styles.mediaInfo}>
          <TypographyText style={[styles.mediaInfoText, {color: t.atoms.text_contrast_medium.color}]}>
            <Trans>
              {media.length === 1 ? '1 media item' : `${media.length} media items`} selected
            </Trans>
          </TypographyText>
          
          {!canAddMore && (
            <TypographyText style={[styles.mediaLimitText, {color: t.atoms.text_contrast_medium.color}]}>
              <Trans>Media limit reached</Trans>
            </TypographyText>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 16,
  },
  mediaPreview: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#f0f0f0',
  },
  mediaPreviewDragging: {
    opacity: 0.5,
    transform: [{scale: 1.05}],
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  videoIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 4,
    borderRadius: 4,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    padding: 6,
    borderRadius: 12,
  },
  dragHandle: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 6,
    borderRadius: 12,
  },
  altIndicator: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 255, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  altIndicatorText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  addButton: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#ccc',
    backgroundColor: 'transparent',
  },
  addButtonText: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  mediaInfo: {
    marginTop: 8,
    alignItems: 'center',
  },
  mediaInfoText: {
    fontSize: 14,
  },
  mediaLimitText: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
})