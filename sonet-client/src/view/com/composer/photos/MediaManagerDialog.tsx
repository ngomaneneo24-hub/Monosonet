import React, {useState, useCallback} from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native'
import {Image} from 'expo-image'
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome'
import {faTrash, faArrowsAlt, faEye, faEdit} from '@fortawesome/free-solid-svg-icons'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import DraggableFlatList, {
  type RenderItemParams,
  type ScaleDecorator,
} from 'react-native-draggable-flatlist'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {Button} from '#/components/Button'
import {ComposerImage} from '#/state/gallery'
import {MAX_IMAGES} from '../../state/composer'

const {width: SCREEN_WIDTH} = Dimensions.get('window')
const ITEM_SIZE = (SCREEN_WIDTH - 48) / 2 // 2 columns with gaps

interface MediaManagerDialogProps {
  media: ComposerImage[]
  onMediaChange: (media: ComposerImage[]) => void
  onClose: () => void
  visible: boolean
}

export function MediaManagerDialog({
  media,
  onMediaChange,
  onClose,
  visible,
}: MediaManagerDialogProps) {
  const t = useTheme()
  const {_} = useLingui()
  const [isEditing, setIsEditing] = useState(false)
  
  // Handle media reordering
  const handleDragEnd = useCallback(({data}: {data: ComposerImage[]}) => {
    onMediaChange(data)
  }, [onMediaChange])
  
  // Handle media removal
  const handleRemoveMedia = useCallback((index: number) => {
    Alert.alert(
      _(msg`Remove Media`),
      _(msg`Are you sure you want to remove this media item?`),
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const newMedia = media.filter((_, i) => i !== index)
            onMediaChange(newMedia)
          },
        },
      ]
    )
  }, [media, onMediaChange, _])
  
  // Handle clear all media
  const handleClearAll = useCallback(() => {
    Alert.alert(
      _(msg`Clear All Media`),
      _(msg`Are you sure you want to remove all media items? This action cannot be undone.`),
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            onMediaChange([])
            onClose()
          },
        },
      ]
    )
  }, [onMediaChange, onClose, _])
  
  // Render individual media item
  const renderMediaItem = useCallback(({item, index, drag, isActive}: RenderItemParams<ComposerImage>) => {
    return (
      <ScaleDecorator>
        <TouchableOpacity
          onLongPress={drag}
          disabled={isActive}
          style={[
            styles.mediaItem,
            isActive && styles.mediaItemDragging,
          ]}>
          
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
          
          {/* Alt text indicator */}
          {item.alt && (
            <View style={styles.altIndicator}>
              <Text style={styles.altIndicatorText}>ALT</Text>
            </View>
          )}
          
          {/* Item number */}
          <View style={styles.itemNumber}>
            <Text style={styles.itemNumberText}>{index + 1}</Text>
          </View>
          
          {/* Action buttons */}
          <View style={styles.actionButtons}>
            {/* Remove button */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleRemoveMedia(index)}>
              <FontAwesomeIcon icon={faTrash} size={14} color="white" />
            </TouchableOpacity>
            
            {/* Drag handle */}
            <TouchableOpacity
              style={styles.actionButton}
              onLongPress={drag}>
              <FontAwesomeIcon icon={faArrowsAlt} size={14} color="white" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </ScaleDecorator>
    )
  }, [handleRemoveMedia])
  
  if (!visible) return null
  
  return (
    <View style={styles.overlay}>
      <View style={[styles.container, {backgroundColor: t.atoms.bg.color}]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, {color: t.atoms.text.color}]}>
            <Trans>Media Manager</Trans>
          </Text>
          
          <View style={styles.headerActions}>
            <Button
              onPress={() => setIsEditing(!isEditing)}
              variant="ghost"
              size="small"
              style={styles.editButton}>
              <FontAwesomeIcon 
                icon={faEdit} 
                size={14} 
                color={t.atoms.text_contrast_medium.color} 
              />
              <Text style={[styles.editButtonText, {color: t.atoms.text_contrast_medium.color}]}>
                {isEditing ? _(msg`Done`) : _(msg`Edit`)}
              </Text>
            </Button>
            
            <Button
              onPress={onClose}
              variant="ghost"
              size="small">
              <Trans>Close</Trans>
            </Button>
          </View>
        </View>
        
        {/* Media count */}
        <View style={styles.mediaCount}>
          <Text style={[styles.mediaCountText, {color: t.atoms.text_contrast_medium.color}]}>
            <Trans>{media.length} of {MAX_IMAGES} media items</Trans>
          </Text>
        </View>
        
        {/* Media grid */}
        <ScrollView style={styles.mediaGrid} showsVerticalScrollIndicator={false}>
          <DraggableFlatList
            data={media}
            onDragEnd={handleDragEnd}
            keyExtractor={(item) => item.uri}
            renderItem={renderMediaItem}
            numColumns={2}
            columnWrapperStyle={styles.row}
            scrollEnabled={false}
          />
        </ScrollView>
        
        {/* Footer actions */}
        <View style={styles.footer}>
          {media.length > 0 && (
            <Button
              onPress={handleClearAll}
              variant="outline"
              color="negative"
              style={styles.clearButton}>
              <Trans>Clear All Media</Trans>
            </Button>
          )}
          
          <Button
            onPress={onClose}
            variant="solid"
            color="primary"
            style={styles.doneButton}>
            <Trans>Done</Trans>
          </Button>
        </View>
        
        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={[styles.instructionsText, {color: t.atoms.text_contrast_medium.color}]}>
            <Trans>Long press and drag to reorder media items</Trans>
          </Text>
          <Text style={[styles.instructionsText, {color: t.atoms.text_contrast_medium.color}]}>
            <Trans>Tap the trash icon to remove individual items</Trans>
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    width: SCREEN_WIDTH - 32,
    maxHeight: '80%',
    borderRadius: 16,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editButtonText: {
    fontSize: 12,
  },
  mediaCount: {
    alignItems: 'center',
    marginBottom: 20,
  },
  mediaCountText: {
    fontSize: 14,
    fontWeight: '500',
  },
  mediaGrid: {
    flex: 1,
    marginBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  mediaItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#f0f0f0',
  },
  mediaItemDragging: {
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
  altIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
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
  itemNumber: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemNumberText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 6,
    borderRadius: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  clearButton: {
    flex: 1,
    marginRight: 8,
  },
  doneButton: {
    flex: 1,
    marginLeft: 8,
  },
  instructions: {
    alignItems: 'center',
    gap: 4,
  },
  instructionsText: {
    fontSize: 12,
    textAlign: 'center',
  },
})