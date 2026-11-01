import { ID, flagsOf, resolve } from "./core.js";
import { buildFragment, pulseGain, MANAGED, ANIMATED } from "./shader.js";

let registered = false;
let failure = null;
export const renderingStatus = Object.freeze({
  get registered() { return registered; },
  get ready() { return registered && CONFIG.Token.ring.id === ID; },
  get reason() {
    if (failure) return `TRON renderer disabled: ${failure}`;
    if (!registered) return "Native TRON ring registration has not completed.";
    if (CONFIG.Token.ring.id !== ID) return "Select TRON Identity Rings in core world Dynamic Token Ring settings to enable appearance application. The module does not select it automatically.";
    return "TRON native style is selected. Foundry canvas integration has not been verified in this build; use the included manual checklist.";
  }
});

export function installRing({ policy, report }) {
  Hooks.on("initializeDynamicTokenRingConfig", configuration => {
    try {
      if (game.system.id !== "sf2e" || game.system.version !== "1.6.1" || game.release.generation !== 14) {
        throw new Error("This build targets Foundry v14 / sf2e 1.6.1 only.");
      }
      const D = foundry.canvas.placeables.tokens.DynamicRingData;
      const Core = foundry.canvas.rendering.shaders.TokenRingSamplerShader;
      const effects = foundry.canvas.placeables.tokens.TokenRing.effects;
      if (Object.values(effects).some(value => (Number(value) & (MANAGED | ANIMATED)) !== 0)) {
        throw new Error("Core now uses the TRON rendering state bits.");
      }
      for (const method of ["_preRenderBatch", "batchDefaultUniforms", "_packInterleavedGeometry"]) {
        if (typeof Core[method] !== "function") throw new Error(`Missing shader extension method ${method}.`);
      }
      const fragment = buildFragment(Core._batchFragmentShader);
      class TronRingShader extends Core {
        static classPluginName = "tronIdentityRingBatch";
        static _batchFragmentShader = fragment;
        static batchDefaultUniforms(maxTextures) {
          return { ...super.batchDefaultUniforms(maxTextures), tronGain: 1 };
        }
        static _preRenderBatch(batchRenderer) {
          super._preRenderBatch(batchRenderer);
          const uniforms = batchRenderer._shader?.uniforms;
          if (!uniforms) throw new Error("TRON: core batch shader uniforms are unavailable.");
          uniforms.tronGain = pulseGain(game.time.serverTime, {
            period: game.settings.get(ID, "period"), intensity: game.settings.get(ID, "intensity"),
            enabled: game.settings.get(ID, "animation") && !canvas.photosensitiveMode
          });
        }
        static _packInterleavedGeometry(element, ...args) {
          const ring = element.object?.object?.ring;
          const token = ring?.token?.document;
          if (!ring || !flagsOf(token).managed) return super._packInterleavedGeometry(element, ...args);
          let state = Number(ring.effects) | MANAGED;
          // An opt-out keeps its last assigned hue but no longer animates or receives policy writes.
          if (resolve(token.actor, token, policy()).managed) state |= ANIMATED;
          const copy = new Proxy(ring, { get(target, key) {
            return key === "effects" ? state : Reflect.get(target, key, target);
          } });
          // Preserve mesh getters/private-field receivers; object spreads lose
          // inherited PIXI properties such as vertexData and texture.
          const inner = new Proxy(element.object.object, { get(target, key) {
            return key === "ring" ? copy : Reflect.get(target, key, target);
          } });
          const outer = new Proxy(element.object, { get(target, key) {
            return key === "object" ? inner : Reflect.get(target, key, target);
          } });
          const packed = new Proxy(element, { get(target, key) {
            return key === "object" ? outer : Reflect.get(target, key, target);
          } });
          return super._packInterleavedGeometry(packed, ...args);
        }
      }
      configuration.addConfig(ID, new D({ id: ID, label: "TRON Identity Rings",
        spritesheet: `modules/${ID}/assets/tron-ring.json`, effects: {},
        framework: { shaderClass: TronRingShader } }));
      registered = true;
      console.info(`${ID} | Inspected loaded core pulse/color-band signatures; registered illumination-mask shader. World style unchanged.`);
    } catch (problem) {
      failure = problem.message;
      console.error(`${ID} | Native registration rejected`, problem);
      Hooks.once("ready", () => report(new Error(renderingStatus.reason)));
    }
  });
}
