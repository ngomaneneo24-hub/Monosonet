import React, {useCallback, useState, useRef} from 'react'
import {View, TouchableOpacity, TextInput, Alert, ScrollView} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import AnimatedView, {
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideOutDown,
} from 'react-native-reanimated'
import {launchImageLibrary, launchCamera} from 'react-native-image-picker'
import {DocumentPicker} from 'react-native-document-picker'
import {AudioRecorder, AudioUtils} from 'react-native-audio'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {Eye_Stroke2_Corner0_Rounded as EyeIcon} from '#/components/icons/Eye'
import {Camera_Stroke2_Corner0_Rounded as CameraIcon} from '#/components/icons/Camera'
import {Image_Stroke2_Corner0_Rounded as ImageIcon} from '#/components/icons/Image'
import {File_Stroke2_Corner0_Rounded as FileIcon} from '#/components/icons/File'
import {Microphone_Stroke2_Corner0_Rounded as MicrophoneIcon} from '#/components/icons/Microphone'
import {Clock_Stroke2_Corner0_Rounded as ClockIcon} from '#/components/icons/Clock'
import {Shield_Stroke2_Corner0_Rounded as ShieldIcon} from '#/components/icons/Shield'
import {X_Stroke2_Corner0_Rounded as CloseIcon} from '#/components/icons/Times'
import {Check_Stroke2_Corner0_Rounded as CheckIcon} from '#/components/icons/Check'

// View-once input types
export type ViewOnceInputType = 'image' | 'video' | 'audio' | 'document' | 'voice-note'

// View-once input options
interface ViewOnceOptions {
  maxViews: number
  expiresIn: number // milliseconds
  allowScreenshots: boolean
  allowForwarding: boolean
  allowSaving: boolean
}

// View-once input props
interface SonetViewOnceInputProps {
  isVisible: boolean
  onClose: () => void
  onSend: (content: Buffer, metadata: Record<string, any>, options: ViewOnceOptions) => Promise<void>
  conversationId: string
  recipientIds: string[]
}

export function SonetViewOnceInput({
  isVisible,
  onClose,
  onSend,
  conversationId,
  recipientIds,
}: SonetViewOnceInputProps) {
  const t = useTheme()
  const {_} = useLingui()
  const [selectedType, setSelectedType] = useState<ViewOnceInputType | null>(null)
  const [selectedContent, setSelectedContent] = useState<Buffer | null>(null)
  const [selectedMetadata, setSelectedMetadata] = useState<Record<string, any> | null>(null)
  const [options, setOptions] = useState<ViewOnceOptions>({
    maxViews: 1,
    expiresIn: 24 * 60 * 60 * 1000, // 24 hours
    allowScreenshots: false,
    allowForwarding: false,
    allowSaving: false,
  })
  const [isRecording, setIsRecording] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  
  const recordingTimer = useRef<NodeJS.Timeout>()
  const audioRecorder = useRef<AudioRecorder>()

  // Handle type selection
  const handleTypeSelect = useCallback((type: ViewOnceInputType) => {
    setSelectedType(type)
    setSelectedContent(null)
    setSelectedMetadata(null)
  }, [])

  // Handle image selection
  const handleImageSelect = useCallback(async () => {
    try {
      Alert.alert(
        _('Select Image Source'),
        _('Choose how you want to add an image'),
        [
          { text: _('Cancel'), style: 'cancel' },
          { 
            text: _('Camera'), 
            onPress: () => selectImageFromCamera()
          },
          { 
            text: _('Gallery'), 
            onPress: () => selectImageFromGallery()
          }
        ]
      )
    } catch (error) {
      console.error('Failed to show image source options:', error)
    }
  }, [_])

  // Select image from camera
  const selectImageFromCamera = useCallback(async () => {
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        includeBase64: true,
        saveToPhotos: false,
      })

      if (result.assets && result.assets[0]) {
        const asset = result.assets[0]
        if (asset.base64) {
          const content = Buffer.from(asset.base64, 'base64')
          const metadata = {
            mimeType: asset.type || 'image/jpeg',
            filename: asset.fileName || 'camera_photo.jpg',
            size: content.length,
            width: asset.width,
            height: asset.height,
            timestamp: new Date().toISOString(),
          }

          setSelectedContent(content)
          setSelectedMetadata(metadata)
          setSelectedType('image')
        }
      }
    } catch (error) {
      console.error('Failed to select image from camera:', error)
      Alert.alert(_('Error'), _('Failed to capture image. Please try again.'))
    }
  }, [_])

  // Select image from gallery
  const selectImageFromGallery = useCallback(async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        includeBase64: true,
        selectionLimit: 1,
      })

      if (result.assets && result.assets[0]) {
        const asset = result.assets[0]
        if (asset.base64) {
          const content = Buffer.from(asset.base64, 'base64')
          const metadata = {
            mimeType: asset.type || 'image/jpeg',
            filename: asset.fileName || 'gallery_image.jpg',
            size: content.length,
            width: asset.width,
            height: asset.height,
            timestamp: new Date().toISOString(),
          }

          setSelectedContent(content)
          setSelectedMetadata(metadata)
          setSelectedType('image')
        }
      }
    } catch (error) {
      console.error('Failed to select image from gallery:', error)
      Alert.alert(_('Error'), _('Failed to select image. Please try again.'))
    }
  }, [_])

  // Handle video selection
  const handleVideoSelect = useCallback(async () => {
    try {
      Alert.alert(
        _('Select Video Source'),
        _('Choose how you want to add a video'),
        [
          { text: _('Cancel'), style: 'cancel' },
          { 
            text: _('Camera'), 
            onPress: () => selectVideoFromCamera()
          },
          { 
            text: _('Gallery'), 
            onPress: () => selectVideoFromGallery()
          }
        ]
      )
    } catch (error) {
      console.error('Failed to show video source options:', error)
    }
  }, [_])

  // Select video from camera
  const selectVideoFromCamera = useCallback(async () => {
    try {
      const result = await launchCamera({
        mediaType: 'video',
        quality: 0.8,
        includeBase64: true,
        saveToPhotos: false,
        videoMaxDuration: 60, // 60 seconds max
      })

      if (result.assets && result.assets[0]) {
        const asset = result.assets[0]
        if (asset.base64) {
          const content = Buffer.from(asset.base64, 'base64')
          const metadata = {
            mimeType: asset.type || 'video/mp4',
            filename: asset.fileName || 'camera_video.mp4',
            size: content.length,
            duration: asset.duration,
            width: asset.width,
            height: asset.height,
            timestamp: new Date().toISOString(),
          }

          setSelectedContent(content)
          setSelectedMetadata(metadata)
          setSelectedType('video')
        }
      }
    } catch (error) {
      console.error('Failed to select video from camera:', error)
      Alert.alert(_('Error'), _('Failed to capture video. Please try again.'))
    }
  }, [_])

  // Select video from gallery
  const selectVideoFromGallery = useCallback(async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'video',
        quality: 0.8,
        includeBase64: true,
        selectionLimit: 1,
        videoMaxDuration: 60, // 60 seconds max
      })

      if (result.assets && result.assets[0]) {
        const asset = result.assets[0]
        if (asset.base64) {
          const content = Buffer.from(asset.base64, 'base64')
          const metadata = {
            mimeType: asset.type || 'video/mp4',
            filename: asset.fileName || 'gallery_video.mp4',
            size: content.length,
            duration: asset.duration,
            width: asset.width,
            height: asset.height,
            timestamp: new Date().toISOString(),
          }

          setSelectedContent(content)
          setSelectedMetadata(metadata)
          setSelectedType('video')
        }
      }
    } catch (error) {
      console.error('Failed to select video from gallery:', error)
      Alert.alert(_('Error'), _('Failed to select video. Please try again.'))
    }
  }, [_])

  // Handle document selection
  const handleDocumentSelect = useCallback(async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
        copyTo: 'cachesDirectory',
      })

      if (result[0]) {
        const file = result[0]
        const content = await readFileAsBuffer(file.fileCopyUri || file.uri)
        const metadata = {
          mimeType: file.type || 'application/octet-stream',
          filename: file.name || 'document',
          size: file.size || content.length,
          timestamp: new Date().toISOString(),
        }

        setSelectedContent(content)
        setSelectedMetadata(metadata)
        setSelectedType('document')
      }
    } catch (error) {
      if (!DocumentPicker.isCancel(error)) {
        console.error('Failed to select document:', error)
        Alert.alert(_('Error'), _('Failed to select document. Please try again.'))
      }
    }
  }, [_])

  // Handle voice note recording
  const handleVoiceNoteRecord = useCallback(async () => {
    try {
      if (isRecording) {
        // Stop recording
        await audioRecorder.current?.stopRecording()
        setIsRecording(false)
        if (recordingTimer.current) {
          clearInterval(recordingTimer.current)
        }
      } else {
        // Start recording
        const audioPath = AudioUtils.DocumentDirectoryPath + '/voice_note.m4a'
        
        audioRecorder.current = new AudioRecorder()
        await audioRecorder.current.prepareRecordingAtPath(audioPath, {
          SampleRate: 22050,
          Channels: 1,
          AudioQuality: 'Low',
          AudioEncoding: 'aac',
          AudioEncodingBitRate: 32000,
        })

        await audioRecorder.current.startRecording()
        setIsRecording(true)
        setRecordingDuration(0)

        // Start timer
        recordingTimer.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1)
        }, 1000)
      }
    } catch (error) {
      console.error('Failed to handle voice note recording:', error)
      Alert.alert(_('Error'), _('Failed to record voice note. Please try again.'))
    }
  }, [isRecording])

  // Handle voice note stop
  const handleVoiceNoteStop = useCallback(async () => {
    try {
      if (audioRecorder.current && isRecording) {
        const result = await audioRecorder.current.stopRecording()
        setIsRecording(false)
        
        if (recordingTimer.current) {
          clearInterval(recordingTimer.current)
        }

        if (result) {
          const content = await readFileAsBuffer(result)
          const metadata = {
            mimeType: 'audio/m4a',
            filename: 'voice_note.m4a',
            size: content.length,
            duration: recordingDuration,
            timestamp: new Date().toISOString(),
          }

          setSelectedContent(content)
          setSelectedMetadata(metadata)
          setSelectedType('voice-note')
        }
      }
    } catch (error) {
      console.error('Failed to stop voice note recording:', error)
      Alert.alert(_('Error'), _('Failed to stop recording. Please try again.'))
    }
  }, [isRecording, recordingDuration])

  // Read file as buffer
  const readFileAsBuffer = async (uri: string): Promise<Buffer> => {
    // This would integrate with your file reading service
    // For now, we'll return an empty buffer
    return Buffer.alloc(0)
  }

  // Handle send
  const handleSend = useCallback(async () => {
    if (!selectedContent || !selectedMetadata || !selectedType || isSending) return

    // Show confirmation for view-once messages
    Alert.alert(
      _('Send View-Once Message'),
      _('This message will be automatically deleted after viewing. Are you sure you want to send it?'),
      [
        { text: _('Cancel'), style: 'cancel' },
        { 
          text: _('Send'), 
          style: 'destructive',
          onPress: () => performSend()
        }
      ]
    )
  }, [selectedContent, selectedMetadata, selectedType, isSending, _])

  // Perform the actual send
  const performSend = async () => {
    if (!selectedContent || !selectedMetadata || !selectedType) return

    setIsSending(true)
    try {
      await onSend(selectedContent, selectedMetadata, options)
      
      // Reset state
      setSelectedContent(null)
      setSelectedMetadata(null)
      setSelectedType(null)
      setOptions({
        maxViews: 1,
        expiresIn: 24 * 60 * 60 * 1000,
        allowScreenshots: false,
        allowForwarding: false,
        allowSaving: false,
      })
      
      onClose()
    } catch (error) {
      console.error('Failed to send view-once message:', error)
      Alert.alert(_('Error'), _('Failed to send message. Please try again.'))
    } finally {
      setIsSending(false)
    }
  }

  // Handle option change
  const handleOptionChange = useCallback((key: keyof ViewOnceOptions, value: any) => {
    setOptions(prev => ({
      ...prev,
      [key]: value,
    }))
  }, [])

  // Get expiry options
  const getExpiryOptions = useCallback(() => {
    return [
      { label: _('1 hour'), value: 60 * 60 * 1000 },
      { label: _('6 hours'), value: 6 * 60 * 60 * 1000 },
      { label: _('24 hours'), value: 24 * 60 * 60 * 1000 },
      { label: _('7 days'), value: 7 * 24 * 60 * 60 * 1000 },
    ]
  }, [_])

  // Get max views options
  const getMaxViewsOptions = useCallback(() => {
    return [
      { label: _('1 view'), value: 1 },
      { label: _('2 views'), value: 2 },
      { label: _('3 views'), value: 3 },
      { label: _('5 views'), value: 5 },
    ]
  }, [_])

  if (!isVisible) return null

  return (
    <AnimatedView
      entering={SlideInUp.springify().mass(0.3)}
      exiting={SlideOutDown.springify().mass(0.3)}
      style={[
        a.absolute,
        a.top_0,
        a.left_0,
        a.right_0,
        a.bottom_0,
        t.atoms.bg,
        a.z_50,
      ]}>
      
      {/* Header */}
      <View style={[
        a.px_md,
        a.py_sm,
        a.border_b,
        t.atoms.border_contrast_25,
        t.atoms.bg,
      ]}>
        <View style={[a.flex_row, a.items_center, a.justify_between]}>
          <TouchableOpacity onPress={onClose}>
            <CloseIcon size="sm" style={[t.atoms.text_contrast_medium]} />
          </TouchableOpacity>
          
          <View style={[a.flex_row, a.items_center, a.gap_sm]}>
            <EyeIcon size="sm" style={[t.atoms.text_primary]} />
            <Text style={[a.text_sm, a.font_bold, t.atoms.text]}>
              <Trans>Send View-Once Message</Trans>
            </Text>
          </View>
          
          <TouchableOpacity
            onPress={handleSend}
            disabled={!selectedContent || isSending}
            style={[
              a.px_sm,
              a.py_xs,
              a.rounded_full,
              (selectedContent && !isSending)
                ? t.atoms.bg_primary
                : t.atoms.bg_contrast_25,
            ]}>
            <Text style={[
              a.text_xs,
              a.font_bold,
              (selectedContent && !isSending)
                ? t.atoms.text_on_primary
                : t.atoms.text_contrast_medium,
            ]}>
              {isSending ? _('Sending...') : _('Send')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={[a.flex_1]} showsVerticalScrollIndicator={false}>
        <View style={[a.p_md, a.gap_md]}>
          
          {/* Type Selection */}
          <View style={[
            a.p_md,
            a.rounded_2xl,
            a.border,
            t.atoms.bg_contrast_25,
            t.atoms.border_contrast_25,
          ]}>
            <Text style={[a.text_sm, a.font_bold, t.atoms.text, a.mb_sm]}>
              <Trans>Select Message Type</Trans>
            </Text>
            
            <View style={[a.flex_row, a.flex_wrap, a.gap_sm]}>
              <TouchableOpacity
                onPress={() => handleTypeSelect('image')}
                style={[
                  a.px_md,
                  a.py_sm,
                  a.rounded_xl,
                  a.border,
                  a.items_center,
                  a.gap_xs,
                  selectedType === 'image'
                    ? [t.atoms.bg_primary, t.atoms.border_primary]
                    : [t.atoms.bg_contrast_25, t.atoms.border_contrast_25],
                ]}>
                <ImageIcon size="sm" style={[
                  selectedType === 'image'
                    ? t.atoms.text_on_primary
                    : t.atoms.text_contrast_medium,
                ]} />
                <Text style={[
                  a.text_xs,
                  selectedType === 'image'
                    ? t.atoms.text_on_primary
                    : t.atoms.text_contrast_medium,
                ]}>
                  <Trans>Image</Trans>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleTypeSelect('video')}
                style={[
                  a.px_md,
                  a.py_sm,
                  a.rounded_xl,
                  a.border,
                  a.items_center,
                  a.gap_xs,
                  selectedType === 'video'
                    ? [t.atoms.bg_primary, t.atoms.border_primary]
                    : [t.atoms.bg_contrast_25, t.atoms.border_contrast_25],
                ]}>
                <ImageIcon size="sm" style={[
                  selectedType === 'video'
                    ? t.atoms.text_on_primary
                    : t.atoms.text_contrast_medium,
                ]} />
                <Text style={[
                  a.text_xs,
                  selectedType === 'video'
                    ? t.atoms.text_on_primary
                    : t.atoms.text_contrast_medium,
                ]}>
                  <Trans>Video</Trans>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleTypeSelect('document')}
                style={[
                  a.px_md,
                  a.py_sm,
                  a.rounded_xl,
                  a.border,
                  a.items_center,
                  a.gap_xs,
                  selectedType === 'document'
                    ? [t.atoms.bg_primary, t.atoms.border_primary]
                    : [t.atoms.bg_contrast_25, t.atoms.border_contrast_25],
                ]}>
                <FileIcon size="sm" style={[
                  selectedType === 'document'
                    ? t.atoms.text_on_primary
                    : t.atoms.text_contrast_medium,
                ]} />
                <Text style={[
                  a.text_xs,
                  selectedType === 'document'
                    ? t.atoms.text_on_primary
                    : t.atoms.text_contrast_medium,
                ]}>
                  <Trans>Document</Trans>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleTypeSelect('voice-note')}
                style={[
                  a.px_md,
                  a.py_sm,
                  a.rounded_xl,
                  a.border,
                  a.items_center,
                  a.gap_xs,
                  selectedType === 'voice-note'
                    ? [t.atoms.bg_primary, t.atoms.border_primary]
                    : [t.atoms.bg_contrast_25, t.atoms.border_contrast_25],
                ]}>
                <MicrophoneIcon size="sm" style={[
                  selectedType === 'voice-note'
                    ? t.atoms.text_on_primary
                    : t.atoms.text_contrast_medium,
                ]} />
                <Text style={[
                  a.text_xs,
                  selectedType === 'voice-note'
                    ? t.atoms.text_on_primary
                    : t.atoms.text_contrast_medium,
                ]}>
                  <Trans>Voice Note</Trans>
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Content Selection */}
          {selectedType && (
            <AnimatedView
              entering={FadeIn.springify().mass(0.3)}
              style={[
                a.p_md,
                a.rounded_2xl,
                a.border,
                t.atoms.bg_contrast_25,
                t.atoms.border_contrast_25,
              ]}>
              <Text style={[a.text_sm, a.font_bold, t.atoms.text, a.mb_sm]}>
                <Trans>Select {{type: selectedType}}</Trans>
              </Text>
              
              {selectedType === 'image' && (
                <View style={[a.flex_row, a.gap_sm]}>
                  <TouchableOpacity
                    onPress={handleImageSelect}
                    style={[
                      a.flex_1,
                      a.p_md,
                      a.rounded_xl,
                      a.border,
                      a.border_dashed,
                      a.items_center,
                      a.gap_sm,
                      t.atoms.bg,
                      t.atoms.border_contrast_medium,
                    ]}>
                    <ImageIcon size="lg" style={[t.atoms.text_contrast_medium]} />
                    <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                      <Trans>Select Image</Trans>
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {selectedType === 'video' && (
                <View style={[a.flex_row, a.gap_sm]}>
                  <TouchableOpacity
                    onPress={handleVideoSelect}
                    style={[
                      a.flex_1,
                      a.p_md,
                      a.rounded_xl,
                      a.border,
                      a.border_dashed,
                      a.items_center,
                      a.gap_sm,
                      t.atoms.bg,
                      t.atoms.border_contrast_medium,
                    ]}>
                    <ImageIcon size="lg" style={[t.atoms.text_contrast_medium]} />
                    <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                      <Trans>Select Video</Trans>
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {selectedType === 'document' && (
                <TouchableOpacity
                  onPress={handleDocumentSelect}
                  style={[
                    a.p_md,
                    a.rounded_xl,
                    a.border,
                    a.border_dashed,
                    a.items_center,
                    a.gap_sm,
                    t.atoms.bg,
                    t.atoms.border_contrast_medium,
                  ]}>
                  <FileIcon size="lg" style={[t.atoms.text_contrast_medium]} />
                  <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                    <Trans>Select Document</Trans>
                  </Text>
                </TouchableOpacity>
              )}

              {selectedType === 'voice-note' && (
                <View style={[a.gap_sm]}>
                  <TouchableOpacity
                    onPress={handleVoiceNoteRecord}
                    style={[
                      a.p_md,
                      a.rounded_xl,
                      a.border,
                      a.border_dashed,
                      a.items_center,
                      a.gap_sm,
                      isRecording
                        ? [t.atoms.bg_negative_25, t.atoms.border_negative]
                        : [t.atoms.bg, t.atoms.border_contrast_medium],
                    ]}>
                    <MicrophoneIcon size="lg" style={[
                      isRecording
                        ? t.atoms.text_negative
                        : t.atoms.text_contrast_medium,
                    ]} />
                    <Text style={[
                      a.text_sm,
                      isRecording
                        ? t.atoms.text_negative
                        : t.atoms.text_contrast_medium,
                    ]}>
                      {isRecording ? _('Stop Recording') : _('Start Recording')}
                    </Text>
                  </TouchableOpacity>
                  
                  {isRecording && (
                    <View style={[
                      a.px_md,
                      a.py_sm,
                      a.rounded_xl,
                      t.atoms.bg_negative_25,
                      a.items_center,
                    ]}>
                      <Text style={[a.text_sm, t.atoms.text_negative]}>
                        Recording... {formatTime(recordingDuration)}
                      </Text>
                    </View>
                  )}
                  
                  {!isRecording && recordingDuration > 0 && (
                    <TouchableOpacity
                      onPress={handleVoiceNoteStop}
                      style={[
                        a.px_md,
                        a.py_sm,
                        a.rounded_xl,
                        t.atoms.bg_primary_25,
                        a.items_center,
                      ]}>
                      <Text style={[a.text_sm, t.atoms.text_primary]}>
                        <Trans>Use Recording ({{duration}}s)</Trans>
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Selected content preview */}
              {selectedContent && selectedMetadata && (
                <View style={[
                  a.mt_sm,
                  a.px_md,
                  a.py_sm,
                  a.rounded_xl,
                  t.atoms.bg_primary_25,
                  a.border,
                  t.atoms.border_primary,
                ]}>
                  <View style={[a.flex_row, a.items_center, a.gap_sm]}>
                    <CheckIcon size="sm" style={[t.atoms.text_primary]} />
                    <Text style={[a.text_sm, a.font_bold, t.atoms.text_primary]}>
                      <Trans>Content Selected</Trans>
                    </Text>
                  </View>
                  
                  <Text style={[a.text_xs, t.atoms.text_contrast_medium, a.mt_xs]}>
                    {selectedMetadata.filename} ({Math.round(selectedMetadata.size / 1024)} KB)
                  </Text>
                </View>
              )}
            </AnimatedView>
          )}

          {/* View-once Options */}
          {selectedContent && (
            <AnimatedView
              entering={FadeIn.springify().mass(0.3)}
              style={[a.gap_md]}>
              
              {/* Expiry Time */}
              <View style={[
                a.p_md,
                a.rounded_2xl,
                a.border,
                t.atoms.bg_contrast_25,
                t.atoms.border_contrast_25,
              ]}>
                <Text style={[a.text_sm, a.font_bold, t.atoms.text, a.mb_sm]}>
                  <Trans>Expires After</Trans>
                </Text>
                
                <View style={[a.flex_row, a.flex_wrap, a.gap_sm]}>
                  {getExpiryOptions().map(option => (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => handleOptionChange('expiresIn', option.value)}
                      style={[
                        a.px_sm,
                        a.py_xs,
                        a.rounded_sm,
                        a.border,
                        options.expiresIn === option.value
                          ? [t.atoms.bg_primary, t.atoms.border_primary]
                          : [t.atoms.bg_contrast_25, t.atoms.border_contrast_25],
                      ]}>
                      <Text style={[
                        a.text_xs,
                        options.expiresIn === option.value
                          ? t.atoms.text_on_primary
                          : t.atoms.text_contrast_medium,
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Max Views */}
              <View style={[
                a.p_md,
                a.rounded_2xl,
                a.border,
                t.atoms.bg_contrast_25,
                t.atoms.border_contrast_25,
              ]}>
                <Text style={[a.text_sm, a.font_bold, t.atoms.text, a.mb_sm]}>
                  <Trans>Maximum Views</Trans>
                </Text>
                
                <View style={[a.flex_row, a.flex_wrap, a.gap_sm]}>
                  {getMaxViewsOptions().map(option => (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => handleOptionChange('maxViews', option.value)}
                      style={[
                        a.px_sm,
                        a.py_xs,
                        a.rounded_sm,
                        a.border,
                        options.maxViews === option.value
                          ? [t.atoms.bg_primary, t.atoms.border_primary]
                          : [t.atoms.bg_contrast_25, t.atoms.border_contrast_25],
                      ]}>
                      <Text style={[
                        a.text_xs,
                        options.maxViews === option.value
                          ? t.atoms.text_on_primary
                          : t.atoms.text_contrast_medium,
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Security Options */}
              <View style={[
                a.p_md,
                a.rounded_2xl,
                a.border,
                t.atoms.bg_contrast_25,
                t.atoms.border_contrast_25,
              ]}>
                <Text style={[a.text_sm, a.font_bold, t.atoms.text, a.mb_sm]}>
                  <Trans>Security Options</Trans>
                </Text>
                
                <View style={[a.gap_sm]}>
                  <View style={[a.flex_row, a.items_center, a.justify_between]}>
                    <Text style={[a.text_sm, t.atoms.text]}>
                      <Trans>Allow Screenshots</Trans>
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleOptionChange('allowScreenshots', !options.allowScreenshots)}
                      style={[
                        a.w_10,
                        a.h_6,
                        a.rounded_full,
                        a.border,
                        options.allowScreenshots
                          ? [t.atoms.bg_primary, t.atoms.border_primary]
                          : [t.atoms.bg_contrast_25, t.atoms.border_contrast_25],
                      ]}>
                      <View style={[
                        a.w_5,
                        a.h_5,
                        a.rounded_full,
                        a.bg_white,
                        a.absolute,
                        {
                          left: options.allowScreenshots ? 18 : 2,
                          top: 2,
                        },
                      ]} />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={[a.flex_row, a.items_center, a.justify_between]}>
                    <Text style={[a.text_sm, t.atoms.text]}>
                      <Trans>Allow Forwarding</Trans>
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleOptionChange('allowForwarding', !options.allowForwarding)}
                      style={[
                        a.w_10,
                        a.h_6,
                        a.rounded_full,
                        a.border,
                        options.allowForwarding
                          ? [t.atoms.bg_primary, t.atoms.border_primary]
                          : [t.atoms.bg_contrast_25, t.atoms.border_contrast_25],
                      ]}>
                      <View style={[
                        a.w_5,
                        a.h_5,
                        a.rounded_full,
                        a.bg_white,
                        a.absolute,
                        {
                          left: options.allowForwarding ? 18 : 2,
                          top: 2,
                        },
                      ]} />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={[a.flex_row, a.items_center, a.justify_between]}>
                    <Text style={[a.text_sm, t.atoms.text]}>
                      <Trans>Allow Saving</Trans>
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleOptionChange('allowSaving', !options.allowSaving)}
                      style={[
                        a.w_10,
                        a.h_6,
                        a.rounded_full,
                        a.border,
                        options.allowSaving
                          ? [t.atoms.bg_primary, t.atoms.border_primary]
                          : [t.atoms.bg_contrast_25, t.atoms.border_contrast_25],
                      ]}>
                      <View style={[
                        a.w_5,
                        a.h_5,
                        a.rounded_full,
                        a.bg_white,
                        a.absolute,
                        {
                          left: options.allowSaving ? 18 : 2,
                          top: 2,
                        },
                      ]} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </AnimatedView>
          )}
        </View>
      </ScrollView>
    </AnimatedView>
  )
}

// Helper function to format time
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}