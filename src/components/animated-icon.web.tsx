import { Image } from 'expo-image'
import { StyleSheet, View } from 'react-native'

export function AnimatedSplashOverlay() {
  return null
}

export function AnimatedIcon() {
  return (
    <View style={styles.iconContainer}>
      <View style={styles.background} />
      <Image
        style={styles.image}
        source={require('@/assets/images/expo-logo.png')}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 128,
    height: 128
  },
  image: {
    position: 'absolute',
    width: 76,
    height: 71
  },
  background: {
    borderRadius: 40,
    width: 128,
    height: 128,
    backgroundColor: '#208AEF'
  }
})
