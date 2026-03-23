import { Canvas, Fill, Shader, Skia, vec } from '@shopify/react-native-skia'
import { Button } from 'heroui-native'
import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated'

import { useTranslation } from '@/lib/i18n'

const CANVAS_SIZE = 160

const loaderSource = Skia.RuntimeEffect.Make(`
  uniform float time;
  uniform vec2 size;

  const float SCALE = 0.5;
  const float SPEED = 0.25;
  const float INTENSITY = 20.0;
  const float LENGTH = 0.5;
  const float RADIUS = 0.020;
  const float FADING = 0.125;
  const float GLOW = 2.0;
  const float M_2_PI = 6.28318530;

  vec2 sdBezier(vec2 pos, vec2 A, vec2 B, vec2 C) {
    vec2 a = B - A;
    vec2 b = A - 2.0 * B + C;
    vec2 c = a * 2.0;
    vec2 d = A - pos;

    float kk = 1.0 / dot(b, b);
    float kx = kk * dot(a, b);
    float ky = kk * (2.0 * dot(a, a) + dot(d, b)) / 3.0;
    float kz = kk * dot(d, a);

    float p = ky - kx * kx;
    float p3 = p * p * p;
    float q = kx * (2.0 * kx * kx - 3.0 * ky) + kz;
    float h = q * q + 4.0 * p3;

    h = sqrt(max(h, 0.0));
    vec2 x = (vec2(h, -h) - q) / 2.0;
    vec2 uv = sign(x) * pow(abs(x), vec2(1.0 / 3.0));
    float t = clamp(uv.x + uv.y - kx, 0.0, 1.0);

    return vec2(length(d + (c + b * t) * t), t);
  }

  vec2 circle(float t) {
    return SCALE * vec2(sin(t), cos(t));
  }

  vec2 leminiscate(float t) {
    float s = sin(t);
    float co = cos(t);
    float denom = 1.0 + s * s;
    return SCALE * vec2(co / denom, s * co / denom);
  }

  float mapinfinite(vec2 pos, float sp) {
    float t = fract(-SPEED * time * sp);
    float dl = LENGTH / INTENSITY;
    vec2 p1 = leminiscate(t * M_2_PI);
    vec2 p2 = leminiscate((dl + t) * M_2_PI);
    vec2 ct = (p1 + p2) / 2.0;
    float d = 1e9;

    for (int i = 2; i < 20; i++) {
      float fi = float(i);
      p1 = p2;
      p2 = leminiscate((fi * dl + t) * M_2_PI);
      vec2 c_prev = ct;
      ct = (p1 + p2) / 2.0;
      vec2 f = sdBezier(pos, c_prev, p1, ct);
      d = min(d, f.x + FADING * (f.y + fi) / INTENSITY);
    }
    return d;
  }

  float mapcircle(vec2 pos, float sp) {
    float t = fract(-SPEED * time * sp);
    float dl = LENGTH / INTENSITY;
    vec2 p1 = circle(t * M_2_PI);
    vec2 p2 = circle((dl + t) * M_2_PI);
    vec2 ct = (p1 + p2) / 2.0;
    float d = 1e9;

    for (int i = 2; i < 20; i++) {
      float fi = float(i);
      p1 = p2;
      p2 = circle((fi * dl + t) * M_2_PI);
      vec2 c_prev = ct;
      ct = (p1 + p2) / 2.0;
      vec2 f = sdBezier(pos, c_prev, p1, ct);
      d = min(d, f.x + FADING * (f.y + fi) / INTENSITY);
    }
    return d;
  }

  half4 main(vec2 fragCoord) {
    vec2 uv = (2.0 * fragCoord - size) / size.y;

    float dist1 = mapcircle(uv.yx * vec2(1.0, 0.66), 1.0);
    float dist2 = mapinfinite(uv.xy * vec2(0.66, 1.0), 2.0);
    float dist3 = mapcircle(uv.xy * vec2(1.0, 0.88), 4.0);

    vec3 col1 = vec3(1.0, 0.55, 0.25) * pow(RADIUS / dist1, GLOW);
    vec3 col2 = vec3(0.55, 1.00, 0.25) * pow(RADIUS / dist2, GLOW);
    vec3 col3 = vec3(0.25, 0.55, 1.00) * pow(RADIUS / dist3, GLOW);

    vec3 col = (col1 + col2 + col3) * (2.0 * GLOW);
    float alpha = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
    return half4(col * alpha, alpha);
  }
`)!

interface AiLoaderProps {
  label: string
  onCancel?: () => void
}

export function AiLoader({ label, onCancel }: AiLoaderProps) {
  const { t } = useTranslation()
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
    size: vec(CANVAS_SIZE, CANVAS_SIZE)
  }))

  return (
    <View className="items-center gap-3 py-10">
      <Canvas style={styles.canvas}>
        <Fill>
          <Shader source={loaderSource} uniforms={uniforms} />
        </Fill>
      </Canvas>
      <Text className="text-muted text-sm">{label}</Text>
      {onCancel ? (
        <Button variant="ghost" size="sm" onPress={onCancel}>
          {t('common.cancel')}
        </Button>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  canvas: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE
  }
})
