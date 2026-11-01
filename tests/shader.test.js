import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFragment, pulseGain, ringFunction, MANAGED, ANIMATED } from "../scripts/shader.js";

// Contract fixture, not Foundry source. Native runtime compatibility is intentionally separate.
export const fixture = `
uniform sampler2D tokenRingTexture;
vec2 vRingTextureCoord; vec3 vRingColor; uint vStates;
vec3 unpremultiplySafe(vec4 c) { return c.a > 0.0 ? c.rgb / c.a : vec3(0.0); }
vec4 colorizeTokenRing(in vec4 ring, in float dist) {
  vec3 pulseColor = vRingColor * redChannel * pulseFactor;
  float mixFactor = step(vRingColorBand.x, dist) - step(vRingColorBand.y, dist);
  return ring;
}
vec4 _main() { return colorizeTokenRing(vec4(1.0), 0.0); }
`;
test("custom source delegates unmanaged rings to core and changes the ring function only", () => {
  const output = buildFragment(fixture);
  assert.equal(output.split("vec4 colorizeTokenRing(").length, 2);
  assert.match(output, /vec4 tronCoreColorizeTokenRing/);
  assert.match(output, /return tronCoreColorizeTokenRing\(tronRing, tronDist\)/);
  assert.match(output, /vec4 _main\(\) \{ return colorizeTokenRing/);
  assert.ok(output.includes("vec3 pulseColor = vRingColor * redChannel * pulseFactor;"));
  assert.ok(!ringFunction.includes("vSubject") && !ringFunction.includes("gl_Position"));
});
test("unknown shader signatures fail closed", () => {
  for (const source of [null, "", fixture.replace("vStates", "unknownState"),
    fixture.replace("vec3 pulseColor =", "vec3 altered ="), fixture.replace("vec4 _main() {", "vec4 changed() {"),
    fixture + fixture, fixture.replace("in vec4 ring, in float dist", "in vec3 ring, in float dist")]) {
    assert.throws(() => buildFragment(source));
  }
});
test("pulse has a seamless three-second period, stationary endpoints and specified depth", () => {
  assert.equal(pulseGain(0), 1); assert.equal(pulseGain(3000), 1);
  assert.ok(Math.abs(pulseGain(1500) - 0.55) < 1e-12);
  assert.ok(Math.abs(pulseGain(2999) - pulseGain(1)) < 1e-12);
  assert.equal(pulseGain(1234, { enabled: false }), 1);
  assert.equal(pulseGain(1234, { intensity: 0 }), 1);
  assert.ok(Math.abs(pulseGain(3000, { period: 6, intensity: 0.6 }) - 0.4) < 1e-12);
});
test("custom rendering state uses distinct bits without modifying the document effect mask", () => {
  assert.equal(MANAGED & ANIMATED, 0);
  assert.equal(MANAGED & 0x3f, 0); assert.equal(ANIMATED & 0x3f, 0);
});
