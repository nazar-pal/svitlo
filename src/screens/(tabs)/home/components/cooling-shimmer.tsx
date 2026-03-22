import { Canvas, Fill, Shader, Skia, vec } from '@shopify/react-native-skia'
import { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated'

import { useStatusColors } from '@/lib/generator/status-colors'

const source = Skia.RuntimeEffect.Make(`
  uniform float time;
  uniform vec2 size;
  uniform float restProgress;
  uniform vec3 colorWarning;
  uniform vec3 colorSuccess;

  half4 main(vec2 fragCoord) {
    vec2 uv = fragCoord / size;

    // Color transitions from warning toward success as rest completes
    vec3 color = mix(colorWarning, colorSuccess, smoothstep(0.7, 1.0, restProgress));

    // Slow downward-drifting wave pattern (settling, cooling)
    float wave1 = sin(uv.x * 8.0 + uv.y * 3.0 + time * 0.5) * 0.5 + 0.5;
    float wave2 = sin(uv.x * 5.0 - uv.y * 4.0 + time * 0.3) * 0.5 + 0.5;
    float pattern = wave1 * wave2;

    // Vertical fade: subtle throughout, strongest in upper portion
    float verticalFade = 1.0 - pow(uv.y, 0.8) * 0.5;

    // Fade out as rest approaches completion
    float restFade = 1.0 - smoothstep(0.8, 1.0, restProgress);

    float alpha = pattern * verticalFade * restFade * 0.08;

    return half4(color * alpha, alpha);
  }
`)!

interface CoolingShimmerProps {
  restProgress: number
}

export function CoolingShimmer({ restProgress }: CoolingShimmerProps) {
  const [layout, setLayout] = useState({ width: 0, height: 0 })
  const { success, warning } = useStatusColors()

  const time = useSharedValue(0)
  const restProgressSV = useSharedValue(restProgress)

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

  useEffect(() => {
    restProgressSV.set(withTiming(restProgress, { duration: 300 }))
  }, [restProgress, restProgressSV])

  const uniforms = useDerivedValue(() => ({
    time: time.get(),
    size: vec(layout.width, layout.height),
    restProgress: restProgressSV.get(),
    colorWarning: warning,
    colorSuccess: success
  }))

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      onLayout={e =>
        setLayout({
          width: e.nativeEvent.layout.width,
          height: e.nativeEvent.layout.height
        })
      }
    >
      {layout.width > 0 ? (
        <Canvas style={{ width: layout.width, height: layout.height }}>
          <Fill>
            <Shader source={source} uniforms={uniforms} />
          </Fill>
        </Canvas>
      ) : null}
    </View>
  )
}
