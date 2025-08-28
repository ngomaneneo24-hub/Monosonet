import React, {useCallback, useMemo, useState} from 'react'
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
  Alert,
  Text,
} from 'react-native'
import {Image} from 'expo-image'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {type SonetMedia} from '#/types/sonet'

const {width: screenWidth} = Dimensions.get('window')
const MAX_IMAGE_WIDTH = screenWidth - 80 // Account for padding and avatar
const MAX_IMAGE_HEIGHT = (MAX_IMAGE_WIDTH * 9) / 16 // 16:9 aspect ratio

interface EnhancedMediaGalleryProps {
  images: SonetMedia[]
  maxWidth?: number
  maxHeight?: number
  onImagePress?: (index: number) => void
  onLongPress?: (index: number) => void
}

export function EnhancedMediaGallery({
  images,
  maxWidth = MAX_IMAGE_WIDTH,
  maxHeight = MAX_IMAGE_HEIGHT,
  onImagePress,
  onLongPress,
}: EnhancedMediaGalleryProps) {
  const t = useTheme()
  const {_} = useLingui()
  
  const [imageDimensions, setImageDimensions] = useState<{[key: number]: {width: number; height: number}}>({})

  // Limit to 10 images maximum
  const displayImages = images.slice(0, 10)
  const imageCount = displayImages.length

  const handleImageLoad = useCallback((index: number, width: number, height: number) => {
    setImageDimensions(prev => ({
      ...prev,
      [index]: {width, height}
    }))
  }, [])

  const handleImagePress = useCallback((index: number) => {
    onImagePress?.(index)
  }, [onImagePress])

  const handleImageLongPress = useCallback((index: number) => {
    onLongPress?.(index)
  }, [onLongPress])

  const renderImageOverlay = useCallback((index: number, totalImages: number) => {
    if (totalImages <= 4) return null
    
    return (
      <View style={styles.imageOverlay}>
        <View style={styles.overlayBackground} />
        <View style={styles.overlayText}>
          <Text style={styles.overlayTextContent}>
            +{totalImages - 4}
          </Text>
        </View>
      </View>
    )
  }, [])

  const renderSingleImage = useCallback((image: SonetMedia, index: number) => {
    const aspectRatio = image.width && image.height ? image.width / image.height : 16 / 9
    const imageHeight = Math.min(maxHeight, maxWidth / aspectRatio)
    
    return (
      <Pressable
        key={index}
        style={[styles.singleImageContainer, {height: imageHeight}]}
        onPress={() => handleImagePress(index)}
        onLongPress={() => handleImageLongPress(index)}
      >
        <Image
          source={{uri: image.url}}
          style={[styles.singleImage, {height: imageHeight}]}
          contentFit="cover"
          transition={200}
          onLoad={(e) => {
            const {width, height} = e.source
            handleImageLoad(index, width, height)
          }}
          accessibilityLabel={image.alt || `Image ${index + 1}`}
        />
      </Pressable>
    )
  }, [maxHeight, maxWidth, handleImagePress, handleImageLongPress, handleImageLoad])

  const renderTwoImages = useCallback((images: SonetMedia[]) => {
    const imageWidth = (maxWidth - 4) / 2 // 4px gap between images
    
    return (
      <View style={styles.twoImagesContainer}>
        {images.map((image, index) => (
          <Pressable
            key={index}
            style={[styles.twoImageItem, {width: imageWidth}]}
            onPress={() => handleImagePress(index)}
            onLongPress={() => handleImageLongPress(index)}
          >
            <Image
              source={{uri: image.url}}
              style={[styles.twoImage, {width: imageWidth}]}
              contentFit="cover"
              transition={200}
              onLoad={(e) => {
                const {width, height} = e.source
                handleImageLoad(index, width, height)
              }}
              accessibilityLabel={image.alt || `Image ${index + 1}`}
            />
          </Pressable>
        ))}
      </View>
    )
  }, [maxWidth, handleImagePress, handleImageLongPress, handleImageLoad])

  const renderThreeImages = useCallback((images: SonetMedia[]) => {
    const leftImageWidth = maxWidth * 0.6
    const rightImageWidth = (maxWidth - leftImageWidth - 4) / 2 // 4px gap
    
    return (
      <View style={styles.threeImagesContainer}>
        <Pressable
          style={[styles.threeImageLeft, {width: leftImageWidth}]}
          onPress={() => handleImagePress(0)}
          onLongPress={() => handleImageLongPress(0)}
        >
          <Image
            source={{uri: images[0].url}}
            style={[styles.threeImageLeftImg, {width: leftImageWidth}]}
            contentFit="cover"
            transition={200}
            onLoad={(e) => {
              const {width, height} = e.source
              handleImageLoad(0, width, height)
            }}
            accessibilityLabel={images[0].alt || 'Image 1'}
          />
        </Pressable>
        <View style={styles.threeImagesRight}>
          {images.slice(1).map((image, index) => (
            <Pressable
              key={index + 1}
              style={[styles.threeImageRightItem, {width: rightImageWidth}]}
              onPress={() => handleImagePress(index + 1)}
              onLongPress={() => handleImageLongPress(index + 1)}
            >
              <Image
                source={{uri: image.url}}
                style={[styles.threeImageRightImg, {width: rightImageWidth}]}
                contentFit="cover"
                transition={200}
                onLoad={(e) => {
                  const {width, height} = e.source
                  handleImageLoad(index + 1, width, height)
                }}
                accessibilityLabel={image.alt || `Image ${index + 2}`}
              />
            </Pressable>
          ))}
        </View>
      </View>
    )
  }, [maxWidth, handleImagePress, handleImageLongPress, handleImageLoad])

  const renderFourImages = useCallback((images: SonetMedia[]) => {
    const imageWidth = (maxWidth - 4) / 2 // 4px gap between images
    const imageHeight = (maxHeight - 4) / 2 // 4px gap between rows
    
    return (
      <View style={styles.fourImagesContainer}>
        {images.map((image, index) => (
          <Pressable
            key={index}
            style={[styles.fourImageItem, {width: imageWidth, height: imageHeight}]}
            onPress={() => handleImagePress(index)}
            onLongPress={() => handleImageLongPress(index)}
          >
            <Image
              source={{uri: image.url}}
              style={[styles.fourImage, {width: imageWidth, height: imageHeight}]}
              contentFit="cover"
              transition={200}
              onLoad={(e) => {
                const {width, height} = e.source
                handleImageLoad(index, width, height)
              }}
              accessibilityLabel={image.alt || `Image ${index + 1}`}
            />
          </Pressable>
        ))}
      </View>
    )
  }, [maxWidth, maxHeight, handleImagePress, handleImageLongPress, handleImageLoad])

  const renderGridImages = useCallback((images: SonetMedia[]) => {
    const imageWidth = (maxWidth - 8) / 3 // 8px total gap between 3 columns
    const imageHeight = (maxHeight - 4) / 2 // 4px gap between rows
    
    return (
      <View style={styles.gridImagesContainer}>
        {images.slice(0, 6).map((image, index) => (
          <Pressable
            key={index}
            style={[styles.gridImageItem, {width: imageWidth, height: imageHeight}]}
            onPress={() => handleImagePress(index)}
            onLongPress={() => handleImageLongPress(index)}
          >
            <Image
              source={{uri: image.url}}
              style={[styles.gridImage, {width: imageWidth, height: imageHeight}]}
              contentFit="cover"
              transition={200}
              onLoad={(e) => {
                const {width, height} = e.source
                handleImageLoad(index, width, height)
              }}
              accessibilityLabel={image.alt || `Image ${index + 1}`}
            />
            {index === 5 && images.length > 6 && renderImageOverlay(index, images.length)}
          </Pressable>
        ))}
      </View>
    )
  }, [maxWidth, maxHeight, handleImagePress, handleImageLongPress, handleImageLoad, renderImageOverlay])

  const renderGallery = useMemo(() => {
    if (imageCount === 0) return null
    if (imageCount === 1) return renderSingleImage(displayImages[0], 0)
    if (imageCount === 2) return renderTwoImages(displayImages)
    if (imageCount === 3) return renderThreeImages(displayImages)
    if (imageCount === 4) return renderFourImages(displayImages)
    return renderGridImages(displayImages)
  }, [
    imageCount,
    displayImages,
    renderSingleImage,
    renderTwoImages,
    renderThreeImages,
    renderFourImages,
    renderGridImages
  ])

  if (imageCount === 0) return null

  return (
    <View style={styles.container}>
      {renderGallery}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  singleImageContainer: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  singleImage: {
    width: '100%',
    borderRadius: 12,
  },
  twoImagesContainer: {
    flexDirection: 'row',
    gap: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  twoImageItem: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  twoImage: {
    height: '100%',
    borderRadius: 12,
  },
  threeImagesContainer: {
    flexDirection: 'row',
    gap: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  threeImageLeft: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  threeImageLeftImg: {
    height: '100%',
    borderRadius: 12,
  },
  threeImagesRight: {
    flex: 1,
    gap: 4,
  },
  threeImageRightItem: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  threeImageRightImg: {
    height: '100%',
    borderRadius: 12,
  },
  fourImagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  fourImageItem: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  fourImage: {
    borderRadius: 12,
  },
  gridImagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gridImageItem: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  gridImage: {
    borderRadius: 12,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  overlayText: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTextContent: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
})