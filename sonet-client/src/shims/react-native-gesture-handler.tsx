import React from 'react'

export const GestureHandlerRootView = ({children, style}: any) => (
  <div style={style}>{children}</div>
)

class ChainableGesture {
  onStart(_: any) { return this }
  onUpdate(_: any) { return this }
  onEnd(_: any) { return this }
}

export const Gesture = {
  Pinch() {
    return new ChainableGesture()
  },
}

export const GestureDetector = ({children}: any) => <>{children}</>