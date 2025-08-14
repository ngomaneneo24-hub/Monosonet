declare module 'react-native-gesture-usernamer' {
	export {GestureHandlerRootView as GestureUsernamerRootView, GestureDetector, Gesture} from 'react-native-gesture-handler'
	export type {
		PanGestureHandlerEventPayload as PanGestureUsernamerEventPayload,
		GestureStateChangeEvent,
		GestureUpdateEvent,
		PanGesture,
	} from 'react-native-gesture-handler'
}

declare module 'react-native-keyboard-controller' {
	export {KeyboardAwareScrollView, useKeyboardHandler as useKeyboardUsernamer} from 'react-native-keyboard-controller'
}