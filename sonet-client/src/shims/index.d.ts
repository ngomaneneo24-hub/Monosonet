declare module 'react-native-gesture-handler' {
	export {GestureHandlerRootView as GestureHandlerRootView, GestureDetector, Gesture} from 'react-native-gesture-handler'
	export type {
		PanGestureHandlerEventPayload as PanGestureHandlerEventPayload,
		GestureStateChangeEvent,
		GestureUpdateEvent,
		PanGesture,
	} from 'react-native-gesture-handler'
}

declare module 'react-native-keyboard-controller' {
	export {KeyboardAwareScrollView, useKeyboardHandler as useKeyboardHandler} from 'react-native-keyboard-controller'
}