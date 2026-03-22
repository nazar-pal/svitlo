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
  uniform float intensity;
  uniform float progress;
  uniform float warning;
  uniform vec3 colorSuccess;
  uniform vec3 colorWarning;
  uniform vec3 colorDanger;

  float hash(vec2 p) {
    float h = dot(p, vec2(127.1, 311.7));
    return fract(sin(h) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  // Fractal Brownian Motion — 4 octaves
  float fbm(vec2 p) {
    float value = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
      value += amp * noise(p);
      p *= 2.1;
      amp *= 0.5;
    }
    return value;
  }

  half4 main(vec2 fragCoord) {
    vec2 uv = fragCoord / size;

    // Status color — mirrors SkiaProgressBar logic
    float w = max(warning, 0.001);
    float p = clamp(progress, 0.0, 1.0);
    vec3 color;
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

    // Drift: smoke rises upward, sways side to side
    float t = time;
    vec2 drift = vec2(sin(t * 0.3) * 0.15, cos(t * 0.08) * 5.0);

    // Sample FBM noise at drifted coordinates
    float n = fbm(uv * 3.5 + drift);

    // Vertical fade: strongest at bottom, fades going up
    float verticalFade = pow(uv.y, 1.8);

    // Horizontal fade: centered column
    float centerDist = abs(uv.x - 0.5);
    float horizontalFade = smoothstep(0.6, 0.15, centerDist);

    float mask = verticalFade * horizontalFade;
    float smoke = n * mask * intensity;

    // Cap alpha for translucency
    float alpha = smoke * 0.4;

    // Pre-multiplied alpha
    return half4(color * alpha, alpha);
  }
`)!

interface GeneratorSmokeProps {
  progress: number
  warningFraction: number
}

export function GeneratorSmoke({
  progress,
  warningFraction
}: GeneratorSmokeProps) {
  const [layout, setLayout] = useState({ width: 0, height: 0 })
  const { success, warning, danger } = useStatusColors()

  const time = useSharedValue(0)
  const intensitySV = useSharedValue(0)
  const progressSV = useSharedValue(progress)

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
    intensitySV.set(withTiming(1, { duration: 800 }))
  }, [time, intensitySV])

  useEffect(() => {
    progressSV.set(withTiming(progress, { duration: 300 }))
  }, [progress, progressSV])

  const uniforms = useDerivedValue(() => ({
    time: time.get(),
    size: vec(layout.width, layout.height),
    intensity: intensitySV.get(),
    progress: progressSV.get(),
    warning: warningFraction,
    colorSuccess: success,
    colorWarning: warning,
    colorDanger: danger
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
