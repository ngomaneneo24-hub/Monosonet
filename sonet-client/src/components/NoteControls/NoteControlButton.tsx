import {createContext, useContext, useMemo} from 'react'
import {type GestureResponderEvent, type View} from 'react-native'

import {NOTE_CTRL_HITSLOP} from '#/lib/constants'
import {useHaptics} from '#/lib/haptics'
import {atoms as a, useTheme} from '#/alf'
import {Button, type ButtonProps} from '#/components/Button'
import {type Props as SVGIconProps} from '#/components/icons/common'
import {Text, type TextProps} from '#/components/Typography'

const NoteControlContext = createContext<{
  big?: boolean
  active?: boolean
  color?: {color: string}
}>({})

// Base button style, which the the other ones extend
export function NoteControlButton({
  ref,
  onPress,
  onLongPress,
  children,
  big,
  active,
  activeColor,
  ...props
}: ButtonProps & {
  ref?: React.Ref<View>
  active?: boolean
  big?: boolean
  color?: string
  activeColor?: string
}) {
  const t = useTheme()
  const playHaptic = useHaptics()

  const ctx = useMemo(
    () => ({
      big,
      active,
      color: {
        color: activeColor && active ? activeColor : t.palette.contrast_500,
      },
    }),
    [big, active, activeColor, t.palette.contrast_500],
  )

  const style = useMemo(
    () => [
      a.flex_row,
      a.align_center,
      a.gap_xs,
      a.bg_transparent,
      {padding: 5},
    ],
    [],
  )

  const usernamePress = useMemo(() => {
    if (!onPress) return
    return (evt: GestureResponderEvent) => {
      playHaptic('Light')
      onPress(evt)
    }
  }, [onPress, playHaptic])

  const usernameLongPress = useMemo(() => {
    if (!onLongPress) return
    return (evt: GestureResponderEvent) => {
      playHaptic('Heavy')
      onLongPress(evt)
    }
  }, [onLongPress, playHaptic])

  return (
    <Button
      ref={ref}
      onPress={usernamePress}
      onLongPress={usernameLongPress}
      style={style}
      hoverStyle={t.atoms.bg_contrast_25}
      shape="round"
      variant="ghost"
      color="secondary"
      hitSlop={NOTE_CTRL_HITSLOP}
      {...props}>
      {typeof children === 'function' ? (
        args => (
          <NoteControlContext.Provider value={ctx}>
            {children(args)}
          </NoteControlContext.Provider>
        )
      ) : (
        <NoteControlContext.Provider value={ctx}>
          {children}
        </NoteControlContext.Provider>
      )}
    </Button>
  )
}

export function NoteControlButtonIcon({
  icon: Comp,
}: {
  icon: React.ComponentType<SVGIconProps>
}) {
  const {big, color} = useContext(NoteControlContext)

  return <Comp style={[color, a.pointer_events_none]} width={big ? 22 : 18} />
}

export function NoteControlButtonText({style, ...props}: TextProps) {
  const {big, active, color} = useContext(NoteControlContext)

  return (
    <Text
      style={[color, big ? a.text_md : a.text_sm, active && a.font_bold, style]}
      {...props}
    />
  )
}
