import { Canvas, Fill, Shader, Skia, vec } from '@shopify/react-native-skia'
import { useThemeColor } from 'heroui-native'
import { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated'

import { colorToRgb } from '@/lib/generator/status-colors'

const source = Skia.RuntimeEffect.Make(`
  uniform float time;
  uniform vec2 size;
  uniform vec3 color;

  half4 main(vec2 fragCoord) {
    vec2 uv = fragCoord / size;
    vec2 center = vec2(0.5, 0.5);

    vec2 diff = uv - center;
    float dist = length(diff);

    // Radial falloff — soft circular glow
    float glow = exp(-dist * dist * 4.0);

    // Breathing intensity — calm pulse with persistent floor
    float breath = 0.6 + 0.4 * sin(time * 1.6);

    float alpha = glow * breath * 0.30;

    // Smooth fade to zero at edges
    float edgeFade = smoothstep(0.55, 0.15, dist);
    alpha *= edgeFade;

    return half4(color * alpha, alpha);
  }
`)!

interface IdlePulseProps {
  color?: string
}

export function IdlePulse({ color }: IdlePulseProps) {
  const [layout, setLayout] = useState({ width: 0, height: 0 })
  const accentColor = useThemeColor('accent')
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

  const tintRgb = colorToRgb(color ?? accentColor)

  const uniforms = useDerivedValue(() => ({
    time: time.get(),
    size: vec(layout.width, layout.height),
    color: tintRgb
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
