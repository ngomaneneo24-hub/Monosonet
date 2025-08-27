import {Image, type ImageProps, type ImageSource} from 'expo-image'

interface HighPriorityImageProps extends ImageProps {
  source: ImageSource
}
export function HighPriorityImage({source, ...props}: HighPriorityImageProps) {
  const updatedSource: ImageSource =
    typeof source === 'object' && source && 'uri' in source && source.uri
      ? {uri: source.uri as string}
      : (source as ImageSource)
  return (
    <Image accessibilityIgnoresInvertColors source={updatedSource} {...props} />
  )
}
