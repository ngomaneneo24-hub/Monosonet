import React, {forwardRef, useMemo} from 'react'
import {View, type ViewProps} from 'react-native'

export type LinearGradientPoint = { x: number; y: number }

export type LinearGradientProps = ViewProps & {
  colors: string[]
  locations?: number[]
  start?: LinearGradientPoint
  end?: LinearGradientPoint
}

function toDeg(start?: LinearGradientPoint, end?: LinearGradientPoint) {
  const sx = start?.x ?? 0
  const sy = start?.y ?? 0
  const ex = end?.x ?? 0
  const ey = end?.y ?? 1
  const angle = Math.atan2(ey - sy, ex - sx)
  return (angle * 180) / Math.PI
}

export const LinearGradient = forwardRef<View, LinearGradientProps>(function LinearGradient(
  {style, colors, locations, start, end, ...rest},
  ref,
) {
  const backgroundImage = useMemo(() => {
    const angle = toDeg(start, end)
    if (!colors || colors.length === 0) return undefined
    const stops = colors.map((c, i) => {
      const loc = locations?.[i]
      return typeof loc === 'number' ? `${c} ${Math.round(loc * 100)}%` : c
    })
    return `linear-gradient(${angle}deg, ${stops.join(', ')})`
  }, [colors, locations, start?.x, start?.y, end?.x, end?.y])

  const gradientStyle = useMemo(() => ({
    backgroundImage,
  } as any), [backgroundImage])

  return <View {...rest} style={[style, gradientStyle]} ref={ref} />
})

export default LinearGradient