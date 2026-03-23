import { Canvas, Fill, Shader, Skia, vec } from '@shopify/react-native-skia'
import { Image } from 'expo-image'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect, useState } from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  Keyframe,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming
} from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'

import { appReadyPromise } from '@/lib/app-ready'

const INITIAL_SCALE_FACTOR = Dimensions.get('screen').height / 90
const DURATION = 600
const GLOW_SIZE = 201

const glowSource = Skia.RuntimeEffect.Make(`
  uniform float time;
  uniform vec2 size;

  half4 main(vec2 fragCoord) {
    vec2 uv = fragCoord / size;
    vec2 center = vec2(0.5, 0.5);

    // Rotating peak intensity point
    float angle = time * 0.8;
    vec2 offset = vec2(cos(angle), sin(angle)) * 0.12;
    vec2 glowCenter = center + offset;

    float dist = distance(uv, glowCenter);

    // Soft radial falloff
    float glow = exp(-dist * dist * 8.0);

    // Secondary, slower-rotating wider glow
    float angle2 = -time * 0.5;
    vec2 offset2 = vec2(cos(angle2), sin(angle2)) * 0.08;
    float dist2 = distance(uv, center + offset2);
    float glow2 = exp(-dist2 * dist2 * 5.0);

    // Breathing intensity
    float breath = 0.7 + 0.3 * sin(time * 1.2);

    float combined = (glow * 0.6 + glow2 * 0.4) * breath;

    // App blue palette: #3C9FFE → #0274DF
    vec3 colorBright = vec3(0.235, 0.624, 0.996);
    vec3 colorDeep = vec3(0.008, 0.455, 0.875);
    vec3 color = mix(colorDeep, colorBright, glow);

    // Circular fade to zero before canvas edges
    float edgeFade = smoothstep(0.5, 0.3, distance(uv, center));
    combined *= edgeFade;

    return half4(color * combined, combined * 0.85);
  }
`)!

export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true)
  const opacity = useSharedValue(1)
  const iconOpacity = useSharedValue(1)
  const iconScale = useSharedValue(1)

  useEffect(() => {
    appReadyPromise.then(() => {
      SplashScreen.hideAsync()
      iconScale.value = withTiming(0.6, {
        duration: DURATION * 0.6,
        easing: Easing.in(Easing.ease)
      })
      iconOpacity.value = withTiming(0, { duration: DURATION * 0.5 })
      opacity.value = withDelay(
        DURATION * 0.15,
        withTiming(0, { duration: DURATION * 0.6 }, finished => {
          'worklet'
          if (finished) scheduleOnRN(setVisible, false)
        })
      )
    })
  }, [opacity, iconOpacity, iconScale])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value
  }))

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: iconScale.value }]
  }))

  if (!visible) return null

  return (
    <Animated.View style={[styles.backgroundSolidColor, animatedStyle]}>
      <Animated.View style={[styles.splashIcon, iconAnimatedStyle]}>
        <Image
          source={require('@/assets/images/splash-icon.png')}
          style={styles.splashIconImage}
        />
      </Animated.View>
    </Animated.View>
  )
}

const keyframe = new Keyframe({
  0: {
    transform: [{ scale: INITIAL_SCALE_FACTOR }]
  },
  100: {
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7)
  }
})

const logoKeyframe = new Keyframe({
  0: {
    transform: [{ scale: 1.3 }],
    opacity: 0
  },
  40: {
    transform: [{ scale: 1.3 }],
    opacity: 0,
    easing: Easing.elastic(0.7)
  },
  100: {
    opacity: 1,
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7)
  }
})

function SkiaGlow() {
  const time = useSharedValue(0)

  useEffect(() => {
    time.set(
      withRepeat(
        withTiming(Math.PI * 20, {
          duration: 60_000,
          easing: Easing.linear
        }),
        -1
      )
    )
  }, [time])

  const uniforms = useDerivedValue(() => ({
    time: time.get(),
    size: vec(GLOW_SIZE, GLOW_SIZE)
  }))

  return (
    <Canvas style={styles.glow}>
      <Fill>
        <Shader source={glowSource} uniforms={uniforms} />
      </Fill>
    </Canvas>
  )
}

export function AnimatedIcon() {
  return (
    <View style={styles.iconContainer}>
      <SkiaGlow />

      <Animated.View
        entering={keyframe.duration(DURATION)}
        style={styles.background}
      />
      <Animated.View
        style={styles.imageContainer}
        entering={logoKeyframe.duration(DURATION)}
      >
        <Image
          style={styles.image}
          source={require('@/assets/images/app-logo.png')}
        />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  glow: {
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    position: 'absolute'
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 128,
    height: 128,
    zIndex: 100
  },
  image: {
    position: 'absolute',
    width: 76,
    height: 71
  },
  background: {
    borderRadius: 40,
    experimental_backgroundImage: `linear-gradient(180deg, #3C9FFE, #0274DF)`,
    width: 128,
    height: 128,
    position: 'absolute'
  },
  backgroundSolidColor: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  splashIcon: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  splashIconImage: {
    width: 100,
    height: 100
  }
})
