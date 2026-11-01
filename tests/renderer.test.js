import { test } from "node:test";
import assert from "node:assert/strict";
import { ID, PALETTE } from "../scripts/core.js";

test("native registration uses a private subclass, preserves mesh getters, and never selects the world style", async () => {
  const handlers = new Map(); const registrations = [];
  const coreFragment = `
    uniform sampler2D tokenRingTexture; vec2 vRingTextureCoord;
    vec3 vRingColor; uint vStates;
    vec3 unpremultiplySafe(vec4 c) { return c.rgb; }
    vec4 colorizeTokenRing(in vec4 ring, in float dist) {
      vec3 pulseColor = vRingColor * redChannel * pulseFactor;
      float mixFactor = step(vRingColorBand.x, dist) - step(vRingColorBand.y, dist);
      return ring;
    }
    vec4 _main() { return colorizeTokenRing(vec4(1.0), 0.0); }
  `;
  const packed = [];
  class CoreShader {
    static _batchFragmentShader = coreFragment;
    static batchDefaultUniforms() { return { originalUniform: 7 }; }
    static _preRenderBatch(batch) { batch._shader.uniforms.coreTouched = true; }
    static _packInterleavedGeometry(element) {
      packed.push({ vertices: element.vertexData, effects: element.object.object.ring.effects,
        color: element.object.object.ring.ringColorLittleEndian });
    }
  }
  globalThis.Hooks = { on: (name, callback) => handlers.set(name, callback), once: () => {} };
  globalThis.CONFIG = { Token: { ring: { id: "another-package" } } };
  globalThis.canvas = { photosensitiveMode: false };
  globalThis.game = { system: { id: "sf2e", version: "1.6.1" }, release: { generation: 14 },
    time: { serverTime: 1500 }, settings: { get: (_id, key) => ({ animation: true, period: 3, intensity: 0.45 })[key] } };
  globalThis.foundry = { canvas: { placeables: { tokens: {
    DynamicRingData: class { constructor(data) { Object.assign(this, data); } },
    TokenRing: { effects: { ENABLED: 1, RING_PULSE: 2, COLOR_OVER_SUBJECT: 32 } }
  } }, rendering: { shaders: { TokenRingSamplerShader: CoreShader } } } };
  const { installRing, renderingStatus } = await import("../scripts/renderer.js");
  installRing({ policy: () => ({ palette: PALETTE, rules: [], fallback: "unchanged" }),
    report: error => assert.fail(error.message) });
  handlers.get("initializeDynamicTokenRingConfig")({ addConfig: (...args) => registrations.push(args) });
  assert.equal(registrations.length, 1); assert.equal(registrations[0][0], ID);
  assert.equal(CONFIG.Token.ring.id, "another-package"); assert.equal(renderingStatus.ready, false);
  CONFIG.Token.ring.id = ID; assert.equal(renderingStatus.ready, true);
  const Shader = registrations[0][1].framework.shaderClass;
  assert.notEqual(Shader, CoreShader); assert.equal(CoreShader._batchFragmentShader, coreFragment);
  assert.deepEqual(Shader.batchDefaultUniforms(8), { originalUniform: 7, tronGain: 1 });
  const batch = { _shader: { uniforms: {} } }; Shader._preRenderBatch(batch);
  assert.equal(batch._shader.uniforms.coreTouched, true); assert.equal(batch._shader.uniforms.tronGain, 0.55);
  canvas.photosensitiveMode = true; Shader._preRenderBatch(batch); assert.equal(batch._shader.uniforms.tronGain, 1);
  const document = { flags: { [ID]: { managed: true } }, actor: { type: "character", flags: { [ID]: { classification: "iso" } } } };
  class Ring {
    #token = { document };
    effects = 17;
    ringColorLittleEndian = 0xffffff;
    get token() { return this.#token; }
  }
  const ring = new Ring();
  class Mesh {
    #vertices = [1, 2, 3, 4];
    object = { object: { ring } };
    get vertexData() { return this.#vertices; }
  }
  const mesh = new Mesh(); Shader._packInterleavedGeometry(mesh);
  assert.deepEqual(packed[0], { vertices: [1,2,3,4], effects: 17 | 64 | 128, color: 0xffffff });
  assert.equal(ring.effects, 17);
  document.flags[ID].classification = "unmanaged"; Shader._packInterleavedGeometry(mesh);
  assert.equal(packed[1].effects, 17 | 64);
  document.flags[ID].managed = false; Shader._packInterleavedGeometry(mesh);
  assert.equal(packed[2].effects, 17);
});
