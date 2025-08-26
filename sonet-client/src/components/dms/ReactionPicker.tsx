import React from 'react'
import {View, TouchableOpacity} from 'react-native'
import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'

export function ReactionPicker({onPick}: {onPick: (emoji: string) => void}) {
	const t = useTheme()
	const emojis = ['👍', '❤️', '😂', '😮', '😢', '👏']
	return (
		<View style={[a.flex_row, a.gap_sm, a.px_sm, a.py_xs, a.rounded_full, t.atoms.bg, t.atoms.border_contrast_25, a.border]}>
			{emojis.map(e => (
				<TouchableOpacity key={e} onPress={() => onPick(e)}>
					<Text style={[a.text_lg]}>{e}</Text>
				</TouchableOpacity>
			))}
		</View>
	)
}