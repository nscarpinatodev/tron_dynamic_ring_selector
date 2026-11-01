/** Pure shader source adapter. No changes to the core class or global shaders. */
export const MANAGED = 0x40;
export const ANIMATED = 0x80;
export const MASK_OFFSET = 1254 / 4096;

/** Refuse unknown layouts instead of falling back to tinting/pulsing the housing. */
export function buildFragment(source) {
  if (typeof source !== "string") throw new Error("Core ring fragment source is unavailable.");
  for (const symbol of ["vRingTextureCoord", "tokenRingTexture", "vRingColor", "vStates", "unpremultiplySafe"]) {
    if (!new RegExp(`\\b${symbol}\\b`).test(source)) throw new Error(`Unsupported core ring shader: missing ${symbol}.`);
  }
  // Verify the actually loaded built-in effect, not a hard-coded entire shader.
  for (const anchor of ["vec3 pulseColor = vRingColor * redChannel * pulseFactor;",
    "float mixFactor = step(vRingColorBand.x, dist) - step(vRingColorBand.y, dist);"]) {
    if (source.split(anchor).length !== 2) throw new Error("Core pulse/color-band implementation differs from the inspected v14 source signatures.");
  }
  const signature = /vec4\s+colorizeTokenRing\s*\(\s*(?:in\s+)?vec4\s+(\w+)\s*,\s*(?:in\s+)?float\s+(\w+)\s*\)\s*\{/g;
  const matches = [...source.matchAll(signature)];
  if (matches.length !== 1 || source.split("vec4 _main() {").length !== 2) {
    throw new Error("Unsupported core ring shader function signatures.");
  }
  const renamed = source.replace(signature, (match) => match.replace("colorizeTokenRing", "tronCoreColorizeTokenRing"));
  return renamed.replace("vec4 _main() {", `${ringFunction}\nvec4 _main() {`);
}

export const ringFunction = `
uniform float tronGain;
vec4 colorizeTokenRing(in vec4 tronRing, in float tronDist) {
  if ((vStates & ${MANAGED}U) == 0U) return tronCoreColorizeTokenRing(tronRing, tronDist);
  vec3 base = unpremultiplySafe(tronRing);
  float lightMask = texture(tokenRingTexture, vRingTextureCoord + vec2(${MASK_OFFSET}, 0.0)).r;
  float luminance = max(base.r, max(base.g, base.b));
  float gain = ((vStates & ${ANIMATED}U) != 0U) ? tronGain : 1.0;
  vec3 neutral = vec3(min(base.r, min(base.g, base.b)));
  vec3 housing = mix(base, neutral, step(0.001, lightMask)) * (1.0 - lightMask);
  vec3 light = vRingColor * luminance * lightMask * gain;
  return vec4(housing + light, 1.0) * tronRing.a;
}
`;

export function pulseGain(milliseconds, { period = 3, intensity = 0.45, enabled = true } = {}) {
  if (!enabled) return 1;
  const seconds = Number.isFinite(period) ? Math.min(12, Math.max(1, period)) : 3;
  const depth = Number.isFinite(intensity) ? Math.min(1, Math.max(0, intensity)) : 0.45;
  const phase = ((milliseconds % (seconds * 1000)) / (seconds * 1000)) * 2 * Math.PI;
  return 1 - depth * (0.5 - 0.5 * Math.cos(phase));
}
