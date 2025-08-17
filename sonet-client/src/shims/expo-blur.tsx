import React, {forwardRef, useMemo} from 'react'
import {View, type ViewProps} from 'react-native'

export type BlurTint = 'light' | 'dark' | 'default'

export type BlurViewProps = ViewProps & {
	intensity?: number
	tint?: BlurTint
}

export const BlurView = forwardRef<View, BlurViewProps>(function BlurView(
	props,
	ref,
) {
	const {style, intensity = 0, tint = 'default', ...rest} = props
	const blurStyle = useMemo(() => {
		const px = Math.max(0, Math.min(100, intensity)) / 5
		const bg = tint === 'dark' ? 'rgba(0,0,0,0.2)' : tint === 'light' ? 'rgba(255,255,255,0.2)' : 'transparent'
		return {
			backdropFilter: `blur(${px}px)` as any,
			backgroundColor: bg,
		}
	}, [intensity, tint])
	return (
		<View {...rest} style={[style, blurStyle]} ref={ref} />
	)
})

export default BlurView