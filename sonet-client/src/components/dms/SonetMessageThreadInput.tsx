import React, {forwardRef, useCallback, useState, useImperativeHandle, useRef} from 'react'
import {View, TextInput, TouchableOpacity, Animated} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import AnimatedView, {
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideOutDown,
} from 'react-native-reanimated'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {PaperPlane_Stroke2_Corner0_Rounded as SendIcon} from '#/components/icons/PaperPlane'
import {X_Stroke2_Corner0_Rounded as CloseIcon} from '#/components/icons/Times'
import {Reply_Stroke2_Corner0_Rounded as ReplyIcon} from '#/components/icons/Reply'
import {type ThreadMessage} from './SonetMessageThread'

interface SonetMessageThreadInputProps {
  isVisible: boolean
  replyingTo: ThreadMessage | null
  onSubmit: (content: string) => Promise<void>
  onCancel: () => void
  placeholder?: string
  maxLength?: number
}

export interface SonetMessageThreadInputRef {
  focus: () => void
  blur: () => void
  clear: () => void
}

export const SonetMessageThreadInput = forwardRef<SonetMessageThreadInputRef, SonetMessageThreadInputProps>(
  ({isVisible, replyingTo, onSubmit, onCancel, placeholder, maxLength = 1000}, ref) => {
    const t = useTheme()
    const {_} = useLingui()
    const [content, setContent] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [inputHeight, setInputHeight] = useState(40)
    const textInputRef = useRef<TextInput>(null)
    const heightAnim = useRef(new Animated.Value(0)).current

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
      focus: () => {
        textInputRef.current?.focus()
      },
      blur: () => {
        textInputRef.current?.blur()
      },
      clear: () => {
        setContent('')
      },
    }))

    // Animate height changes
    React.useEffect(() => {
      Animated.spring(heightAnim, {
        toValue: isVisible ? inputHeight : 0,
        useNativeDriver: false,
        tension: 100,
        friction: 8,
      }).start()
    }, [isVisible, inputHeight, heightAnim])

    // Handle content change
    const handleContentChange = useCallback((text: string) => {
      setContent(text)
      // Auto-resize input height
      const newHeight = Math.max(40, Math.min(120, text.split('\n').length * 20 + 20))
      setInputHeight(newHeight)
    }, [])

    // Handle submit
    const handleSubmit = useCallback(async () => {
      if (!content.trim() || isSubmitting) return

      setIsSubmitting(true)
      try {
        await onSubmit(content.trim())
        setContent('')
        setInputHeight(40)
      } catch (error) {
        console.error('Failed to submit thread message:', error)
      } finally {
        setIsSubmitting(false)
      }
    }, [content, isSubmitting, onSubmit])

    // Handle cancel
    const handleCancel = useCallback(() => {
      setContent('')
      setInputHeight(40)
      onCancel()
    }, [onCancel])

    // Handle key press
    const handleKeyPress = useCallback((e: any) => {
      if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    }, [handleSubmit])

    if (!isVisible) return null

    return (
      <AnimatedView
        entering={SlideInUp.springify().mass(0.3)}
        exiting={SlideOutDown.springify().mass(0.3)}
        style={[
          a.border_t,
          t.atoms.border_contrast_25,
          t.atoms.bg,
        ]}>
        
        {/* Reply Preview */}
        {replyingTo && (
          <AnimatedView
            entering={FadeIn.springify().mass(0.3)}
            style={[
              a.px_md,
              a.pt_sm,
              a.pb_xs,
              a.border_b,
              t.atoms.border_contrast_25,
              t.atoms.bg_contrast_25,
            ]}>
            <View style={[a.flex_row, a.items_center, a.justify_between]}>
              <View style={[a.flex_row, a.items_center, a.gap_sm]}>
                <ReplyIcon size="xs" style={[t.atoms.text_contrast_medium]} />
                <Text style={[a.text_xs, t.atoms.text_contrast_medium, a.font_bold]}>
                  Replying to {replyingTo.senderName}
                </Text>
              </View>
              <TouchableOpacity onPress={handleCancel}>
                <CloseIcon size="xs" style={[t.atoms.text_contrast_medium]} />
              </TouchableOpacity>
            </View>
            <Text style={[a.text_xs, t.atoms.text_contrast_medium, a.mt_xs]}>
              {replyingTo.content.length > 80 
                ? replyingTo.content.substring(0, 80) + '...'
                : replyingTo.content
              }
            </Text>
          </AnimatedView>
        )}

        {/* Thread Input */}
        <View style={[a.px_md, a.py_sm]}>
          <View style={[a.flex_row, a.items_end, a.gap_sm]}>
            {/* Text Input */}
            <View style={[a.flex_1, a.relative]}>
              <TextInput
                ref={textInputRef}
                value={content}
                onChangeText={handleContentChange}
                onKeyPress={handleKeyPress}
                placeholder={placeholder || _('Reply to thread...')}
                placeholderTextColor={t.atoms.text_contrast_medium.color}
                multiline
                maxLength={maxLength}
                editable={!isSubmitting}
                style={[
                  a.px_md,
                  a.py_sm,
                  a.rounded_2xl,
                  a.border,
                  a.min_h_10,
                  t.atoms.bg_contrast_25,
                  t.atoms.text,
                  t.atoms.border_contrast_25,
                  {
                    height: inputHeight,
                  },
                ]}
              />
              
              {/* Character Count */}
              {content.length > 0 && (
                <View style={[a.absolute, a.bottom_1, a.right_2]}>
                  <Text
                    style={[
                      a.text_xs,
                      content.length > maxLength * 0.9 ? t.atoms.text_warning : t.atoms.text_contrast_medium,
                    ]}>
                    {content.length}/{maxLength}
                  </Text>
                </View>
              )}
            </View>

            {/* Send Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!content.trim() || isSubmitting}
              style={[
                a.p_2,
                a.rounded_full,
                (content.trim() && !isSubmitting)
                  ? t.atoms.bg_primary
                  : t.atoms.bg_contrast_25,
              ]}>
              <SendIcon
                size="sm"
                style={[
                  (content.trim() && !isSubmitting)
                    ? t.atoms.text_on_primary
                    : t.atoms.text_contrast_medium,
                ]}
              />
            </TouchableOpacity>
          </View>

          {/* Thread Input Footer */}
          <View style={[a.flex_row, a.items_center, a.justify_between, a.mt_xs]}>
            <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
              <Trans>Thread reply</Trans>
            </Text>
            
            <View style={[a.flex_row, a.items_center, a.gap_sm]}>
              <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                Shift+Enter for new line
              </Text>
              <TouchableOpacity
                onPress={handleCancel}
                style={[
                  a.px_sm,
                  a.py_xs,
                  a.rounded_sm,
                  t.atoms.bg_contrast_25,
                ]}>
                <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                  <Trans>Cancel</Trans>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </AnimatedView>
    )
  }
)

SonetMessageThreadInput.displayName = 'SonetMessageThreadInput'