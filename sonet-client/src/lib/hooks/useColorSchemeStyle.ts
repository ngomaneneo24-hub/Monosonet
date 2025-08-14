import {useThemeName} from '#/alf/util/useColorModeTheme'

export function useColorSchemeStyle<T>(lightStyle: T, darkStyle: T) {
  const themeName = useThemeName()
  return themeName === 'dark' ? darkStyle : lightStyle
}
