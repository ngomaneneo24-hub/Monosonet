// Global shims for typecheck-only project

declare const __DEV__: boolean
declare var process: { env: Record<string, string | undefined> }

declare module '*.json' {
  const value: any
  export default value
}

declare module 'react/jsx-runtime' {
  export const jsx: any
  export const jsxs: any
  export const Fragment: any
}

declare module 'expo-application' {
  export type ApplicationReleaseType = any
  export const nativeBuildVersion: string
}

declare module 'expo-file-system' {
  export function copyAsync(input: {from: string; to: string}): Promise<void>
}

declare module '@sonet/api' {
  export type SonetAppAgent = any
  export namespace SonetRepoUploadBlob {
    export type Response = any
  }
}

declare module '#/lib/media/manip' {
  export function safeDeleteAsync(path: string): Promise<void>
}

declare module 'react-native' {
  export type Insets = any
  export const Platform: any
}

declare module '@react-native-async-storage/async-storage' {
  const AsyncStorage: any
  export default AsyncStorage
}
