# Source inspection — 2026-11-01

## Available project and machine

- `/workspace/tron_dynamic_ring_selector` was an unborn/empty Git checkout.
- No tracked source, README, manifests, lockfiles, or repository AGENTS.md existed.
- The artwork ZIP arrived after initial inspection. All eight 1254×1254 RGBA PNGs
  were read directly from the named ZIP members; uploaded scripts were not run.
  The included WebMs are reference material only and are not packaged for playback.
  See `assets/inventory.json` for input hashes and alpha/mask checks.
- No Foundry or installed Starfinder system was found in the inspected workspace,
  `/opt`, or shallow system installation locations. No licensed runtime was supplied.
- Node 24.19.0 and Python 3.12.14 are installed; this project needs no npm install.
  Asset rebuilding uses the existing Pillow 12.3.0 / numpy 2.3.5 installation.

## Exact official system source

Repository: https://github.com/foundryvtt/pf2e

Release tag: `sf2e-1.6.1`, commit
`28d9d156f252d084371d994dc359509b49eadf18`.
Inspected a temporary sparse checkout outside the project. This is an authoritative
release-source inspection, not an inspection of a user-installed system.

- [system.sf2e.json](https://github.com/foundryvtt/pf2e/blob/28d9d156f252d084371d994dc359509b49eadf18/system.sf2e.json):
  `id: sf2e`, `version: 1.6.1`, Foundry minimum 14.361 / verified 14.369 / maximum 14.
- [Character document](https://github.com/foundryvtt/pf2e/blob/28d9d156f252d084371d994dc359509b49eadf18/src/module/actor/character/document.ts):
  character actor has ancestry/background embedded build items.
- [Item base data model](https://github.com/foundryvtt/pf2e/blob/28d9d156f252d084371d994dc359509b49eadf18/src/module/item/base/data/model.ts):
  `system.slug` is a nullable structured SlugField. Item `slug` getter returns
  `system.slug`; the module does not derive missing slugs from names.
- [Actor base data](https://github.com/foundryvtt/pf2e/blob/28d9d156f252d084371d994dc359509b49eadf18/src/module/actor/data/base.ts):
  `ActorTraitsSource.value` is a string trait array. Creature and NPC data extend it.
- [NPC data](https://github.com/foundryvtt/pf2e/blob/28d9d156f252d084371d994dc359509b49eadf18/src/module/actor/npc/data.ts):
  NPC creature traits are supported; no PC-style background field is assumed.
- [Actor sheet base](https://github.com/foundryvtt/pf2e/blob/28d9d156f252d084371d994dc359509b49eadf18/src/module/actor/sheet/base.ts):
  extends `foundry.appv1.sheets.ActorSheet`; v1 header buttons remain relevant for
  this exact v14-compatible system release.

## Foundry v14 API evidence and limit

Official documentation requested at https://foundryvtt.com/api/v14/ . The configured
HTTP proxy returned `403 Forbidden` during CONNECT. The required domain addition
`foundryvtt.com` was saved to the environment configuration draft; saving does not
apply it to the live instance. No TLS verification was disabled or proxy bypassed.

Secondary API evidence: community-maintained
[foundry-vtt-types](https://github.com/League-of-Foundry-Developers/foundry-vtt-types),
package version `14.369.0`, inspected commit
`e613e06e85f6fcded8a9621ad23337f20d0bff70`.
These declarations document v14 signatures but are **not official runtime source**.

Relevant inspected declaration paths under `src/foundry/`:

- `client/canvas/placeables/tokens/ring-config.d.mts`: native registration must
  happen inside `initializeDynamicTokenRingConfig`; `addConfig` adds a selectable
  style; `useConfig` selects one shared configuration.
- `client/canvas/placeables/tokens/ring-data.d.mts`: DynamicRingData includes
  spritesheet, effects, and `framework.ringClass` / `framework.shaderClass`.
- `client/canvas/placeables/tokens/ring.d.mts`: built-in RING_PULSE exists with
  bit `0x02`; ring size lookup, color band and subject properties exist. This does
  **not** prove pulse changes illumination only or keeps geometry stationary.
- `client/canvas/rendering/shaders/samplers/primary/token-ring.d.mts`: shader
  class declaration, with no shader implementation body. Insufficient evidence
  to derive a safe custom illumination shader.
- `client/documents/token.d.mts`: `ring.enabled`, `ring.colors.ring`,
  `ring.colors.background`, `ring.effects`, `ring.subject.texture/scale`.
- `client/hooks.d.mts`: synchronous local `preCreateToken`, global post-update
  hooks, v1 header buttons and ApplicationV2 header controls.
- `client/applications/api/dialog.d.mts`: DialogV2 prompt callback uses
  `button.form.elements`; no v12 Dialog assumptions were used.

## Current v14 implementation evidence and custom shader scope

The following current public implementation was inspected, without copying its
module or adding it as a dependency:
[Ringmaker ring.mjs](https://github.com/cocoomg11/ringmaker/blob/feec6acb77a01e5ca63ff38d14b0b71f06000c2c/scripts/ring.mjs).
Its manifest declares v14 verification; that is the author's claim, not a local
runtime test. Its source identifies these core v14 lines:

```glsl
vec3 pulseColor = vRingColor * redChannel * pulseFactor;
float mixFactor = step(vRingColorBand.x, dist) - step(vRingColorBand.y, dist);
```

The documented recoloring region is radial. A radial band alone cannot independently
identify the cardinal lights, rails, and intervening dark housing. Instead of
enabling that pulse on the whole disc, TRON uses a per-pixel illumination mask.
The module checks that these exact lines each occur once in the **actually loaded**
core shader, checks function/symbol signatures and unused state bits, then subclasses
the core shader through `DynamicRingData.framework.shaderClass`. Unknown source
layouts prevent registration and appearance application. No global core shader or
prototype is patched; the native vertex shader, portrait composition, geometry,
background and remaining core processing are inherited unchanged.

Only the ring-color function is wrapped. Unmarked native rings delegate to the
original core function. Managed rings use the original source alpha, steady housing,
and a separate light-mask atlas frame. Temporary batch-state bits control the
wrapper/pulse without changing document effect masks. Module-specific marker flags
prevent module activation from silently classifying existing manually configured rings.
State/mesh getters are preserved through non-mutating proxies, checked in a contract
test with private-field-backed getters.

Native/Pixi JSON layout was cross-checked against public ring examples:
[Ringmaker sheet](https://github.com/cocoomg11/ringmaker/blob/feec6acb77a01e5ca63ff38d14b0b71f06000c2c/assets/token-ring.json)
and [More Dynamic Token Rings](https://github.com/ChasarooniZ/More-Dynamic-Token-Rings/tree/44ba1699389deae50652a08086c143c6b563b2c1/assets/rings).
The shared source/mask/transparent-background atlas and native `gridTarget` metadata
are generated and included, not placeholder file paths.

## Validation limits

No licensed Foundry runtime was supplied. Native ring loading, the full core shader
link, portrait composition, canvas fit, sheet hooks and actual multi-client document
traffic are unverified. Automatic runtime source inspection reduces compatibility
risk but is not proof of successful full-canvas integration.

Official v14 documentation remained blocked by environment policy. The draft domain
addition does not establish applied access. The secondary API declarations and
current public v14 implementation above were inspected; no old-version example was
silently treated as current official source. Complete the official-source review
and manual runtime checks before marking this module `verified`.

The standalone WebGL2 test compiles and exercises the exact custom ring function
against the real atlas, using a small test scaffold. It does not compile Foundry's
entire proprietary shader. Its current result, browser version and artifact hashes
are recorded in `webgl-results.json`; failed or unavailable runs must not be described
as passed Foundry tests.
