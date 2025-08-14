import React from 'react'
import {FlatList, ViewStyle} from 'react-native'

export type RenderItemParams<T> = {
	item: T
	index: number
	drag?: () => void
	isActive?: boolean
}

export const ScaleDecorator = ({children}: {children: React.ReactNode}) => (
	<>{children}</>
)

type Props<T> = {
	data: readonly T[]
	renderItem: (params: RenderItemParams<T>) => React.ReactElement | null
	keyExtractor?: (item: T, index: number) => string
	numColumns?: number
	columnWrapperStyle?: ViewStyle
	scrollEnabled?: boolean
}

export default function DraggableFlatList<T>({
	data,
	renderItem,
	keyExtractor,
	numColumns,
	columnWrapperStyle,
	scrollEnabled,
}: Props<T>) {
	return (
		<FlatList
			data={data as T[]}
			renderItem={({item, index}) =>
				renderItem({item, index, drag: () => {}, isActive: false})
			}
			keyExtractor={keyExtractor as any}
			numColumns={numColumns}
			columnWrapperStyle={columnWrapperStyle as any}
			scrollEnabled={scrollEnabled}
		/>
	)
}