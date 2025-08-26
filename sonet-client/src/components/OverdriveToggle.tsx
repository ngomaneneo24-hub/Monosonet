import React from 'react'
import {View, Switch, Text, StyleSheet} from 'react-native'
import {useTheme} from '#/alf'
import {overdriveAPI} from '#/lib/api/feed/overdrive'

interface OverdriveToggleProps {
	onToggle?: (enabled: boolean) => void
}

export function OverdriveToggle({onToggle}: OverdriveToggleProps) {
	const t = useTheme()
	const [isEnabled, setIsEnabled] = React.useState(overdriveAPI.isOverdriveEnabled())

	const handleToggle = (value: boolean) => {
		setIsEnabled(value)
		
		if (value) {
			overdriveAPI.enableOverdrive()
		} else {
			overdriveAPI.disableOverdrive()
		}
		
		onToggle?.(value)
	}

	return (
		<View style={[styles.container, {backgroundColor: t.palette.background}]}>
			<View style={styles.content}>
				<View style={styles.textContainer}>
					<Text style={[styles.title, {color: t.palette.text}]}>
						Overdrive ML
					</Text>
					<Text style={[styles.description, {color: t.palette.textSecondary}]}>
						Enable AI-powered personalized recommendations
					</Text>
				</View>
				<Switch
					value={isEnabled}
					onValueChange={handleToggle}
					trackColor={{false: t.palette.neutral_300, true: t.palette.primary_500}}
					thumbColor={isEnabled ? t.palette.primary_600 : t.palette.neutral_100}
				/>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		padding: 16,
		borderRadius: 12,
		marginHorizontal: 16,
		marginVertical: 8,
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.1,
		shadowRadius: 3.84,
		elevation: 5,
	},
	content: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	textContainer: {
		flex: 1,
		marginRight: 16,
	},
	title: {
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 4,
	},
	description: {
		fontSize: 14,
		lineHeight: 20,
	},
})