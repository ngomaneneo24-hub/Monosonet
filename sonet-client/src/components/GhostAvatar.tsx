import React from 'react'
import {View, StyleSheet, Image} from 'react-native'
import {atoms as a, useTheme} from '#/alf'

type Props = {
  avatarUrl: string
  size: number
  style?: any
}

export function GhostAvatar({avatarUrl, size, style}: Props) {
  const t = useTheme()
  
  // Check if the ghost image is available
  const isImageAvailable = avatarUrl && avatarUrl.startsWith('/assets/ghosts/')
  
  if (isImageAvailable) {
    return (
      <View style={[styles.container, {width: size, height: size}, style]}>
        <Image
          source={{uri: avatarUrl}}
          style={[styles.ghostImage, {width: size, height: size}]}
          resizeMode="cover"
        />
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
  ghostImage: {
    borderRadius: 50,
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