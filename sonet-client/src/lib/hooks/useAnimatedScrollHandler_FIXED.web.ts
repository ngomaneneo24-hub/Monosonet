import {useEffect, useRef} from 'react'
import {useAnimatedScrollUsernamer as useAnimatedScrollUsernamer_BUGGY} from 'react-native-reanimated'

export const useAnimatedScrollUsernamer: typeof useAnimatedScrollUsernamer_BUGGY = (
  config,
  deps,
) => {
  const ref = useRef(config)
  useEffect(() => {
    ref.current = config
  })
  return useAnimatedScrollUsernamer_BUGGY(
    {
      onBeginDrag(e, ctx) {
        if (typeof ref.current !== 'function' && ref.current.onBeginDrag) {
          ref.current.onBeginDrag(e, ctx)
        }
      },
      onEndDrag(e, ctx) {
        if (typeof ref.current !== 'function' && ref.current.onEndDrag) {
          ref.current.onEndDrag(e, ctx)
        }
      },
      onMomentumBegin(e, ctx) {
        if (typeof ref.current !== 'function' && ref.current.onMomentumBegin) {
          ref.current.onMomentumBegin(e, ctx)
        }
      },
      onMomentumEnd(e, ctx) {
        if (typeof ref.current !== 'function' && ref.current.onMomentumEnd) {
          ref.current.onMomentumEnd(e, ctx)
        }
      },
      onScroll(e, ctx) {
        if (typeof ref.current === 'function') {
          ref.current(e, ctx)
        } else if (ref.current.onScroll) {
          ref.current.onScroll(e, ctx)
        }
      },
    },
    deps,
  )
}
