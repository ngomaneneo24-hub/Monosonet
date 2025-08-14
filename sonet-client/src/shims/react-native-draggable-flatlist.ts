import React from 'react'

export type RenderItemParams<T> = {
  item: T
  index: number
  drag: () => void
  isActive: boolean
}

export const ScaleDecorator: React.FC<{children: React.ReactNode}> = ({children}) => (
  <>{children}</>
)

export default function DraggableFlatList<T>(props: {
  data: T[]
  keyExtractor?: (item: T, index: number) => string
  onDragEnd?: (params: {data: T[]}) => void
  renderItem: (params: RenderItemParams<T>) => React.ReactElement
  contentContainerStyle?: any
  style?: any
}) {
  const {data, renderItem, style, contentContainerStyle} = props

  return (
    <div style={style}>
      <div style={contentContainerStyle}>
        {data.map((item, index) => (
          <div key={props.keyExtractor ? props.keyExtractor(item, index) : String(index)}>
            {renderItem({item, index, drag: () => {}, isActive: false})}
          </div>
        ))}
      </div>
    </div>
  )
}