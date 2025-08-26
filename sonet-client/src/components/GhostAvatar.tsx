import React from 'react'
import {View, StyleSheet} from 'react-native'
import {atoms as a, useTheme} from '#/alf'

type Props = {
  avatarUrl: string
  size: number
  style?: any
}

export function GhostAvatar({avatarUrl, size, style}: Props) {
  const t = useTheme()
  
  // For now, we'll use a placeholder since the images aren't uploaded yet
  // This will be replaced with actual image loading when the assets are available
  const isImageAvailable = false // TODO: Replace with actual image availability check
  
  if (isImageAvailable) {
    // TODO: Implement actual image loading when assets are available
    return (
      <View style={[styles.container, {width: size, height: size}, style]}>
        {/* Image will go here */}
      </View>
    )
  }
  
  // Fallback to a styled ghost placeholder
  return (
    <View 
      style={[
        styles.ghostPlaceholder, 
        {width: size, height: size, borderRadius: size / 2},
        {backgroundColor: t.palette.primary_100, borderColor: t.palette.primary_300},
        style
      ]}
    >
      <View style={[styles.ghostFace, {borderColor: t.palette.primary_500}]}>
        <View style={[styles.eye, {backgroundColor: t.palette.primary_500}]} />
        <View style={[styles.eye, {backgroundColor: t.palette.primary_500}]} />
        <View style={[styles.mouth, {backgroundColor: t.palette.primary_500}]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 50,
    overflow: 'hidden',
  },
  ghostPlaceholder: {
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ghostFace: {
    width: '60%',
    height: '60%',
    borderWidth: 2,
    borderRadius: 20,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 8,
  },
  eye: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  mouth: {
    width: 12,
    height: 2,
    borderRadius: 1,
  },
})