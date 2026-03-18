import {
  Canvas,
  RoundedRect,
  Shader,
  Skia,
  vec
} from '@shopify/react-native-skia'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import {
  useDerivedValue,
  useSharedValue,
  withTiming
} from 'react-native-reanimated'

import { useStatusColors } from '@/lib/generator/status-colors'

const source = Skia.RuntimeEffect.Make(`
  uniform float progress;
  uniform float warning;
  uniform float mode;
  uniform vec2 size;
  uniform vec3 colorSuccess;
  uniform vec3 colorWarning;
  uniform vec3 colorDanger;

  half4 main(vec2 fragCoord) {
    float p = clamp(progress, 0.0, 1.0);
    float w = max(warning, 0.001);
    float fillEdge = p * size.x;
    float alpha = smoothstep(fillEdge + 0.5, fillEdge - 0.5, fragCoord.x);

    vec3 color;
    if (mode > 0.5) {
      // Resting: warning → success as rest completes
      color = mix(colorWarning, colorSuccess, smoothstep(0.85, 1.0, p));
    } else {
      // Running: success → warning → danger based on progress
      if (p < w * 0.9) {
        color = colorSuccess;
      } else if (p < w) {
        float t = (p - w * 0.9) / (w * 0.1);
        color = mix(colorSuccess, colorWarning, smoothstep(0.0, 1.0, t));
      } else if (p < 1.0) {
        float t = (p - w) / (1.0 - w);
        color = mix(colorWarning, colorDanger, smoothstep(0.0, 1.0, t));
      } else {
        color = colorDanger;
      }
    }

    // Soft glow at leading edge
    float distFromEdge = fragCoord.x - fillEdge;
    float glowRange = size.y * 2.5;
    float glow = exp(-distFromEdge * distFromEdge / (size.y * size.y * 1.5)) * 0.3;
    float glowMask = step(0.0, distFromEdge) * step(distFromEdge, glowRange);
    float finalAlpha = max(alpha, glow * glowMask);

    return half4(color * finalAlpha, finalAlpha);
  }
`)!

interface SkiaProgressBarProps {
  progress: number
  warningFraction: number
  height: number
  mode?: 'running' | 'resting'
}

export function SkiaProgressBar({
  progress,
  warningFraction,
  height,
  mode = 'running'
}: SkiaProgressBarProps) {
  const [width, setWidth] = useState(0)
  const { success, warning, danger } = useStatusColors()
  const progressSV = useSharedValue(progress)

  useEffect(() => {
    progressSV.set(withTiming(progress, { duration: 300 }))
  }, [progress, progressSV])

  const uniforms = useDerivedValue(() => ({
    progress: progressSV.get(),
    warning: warningFraction,
    mode: mode === 'resting' ? 1.0 : 0.0,
    size: vec(width, height),
    colorSuccess: success,
    colorWarning: warning,
    colorDanger: danger
  }))

  return (
    <View
      className="flex-1"
      onLayout={e => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 ? (
        <Canvas style={{ width, height }}>
          <RoundedRect x={0} y={0} width={width} height={height} r={height / 2}>
            <Shader source={source} uniforms={uniforms} />
          </RoundedRect>
        </Canvas>
      ) : null}
    </View>
  )
}
