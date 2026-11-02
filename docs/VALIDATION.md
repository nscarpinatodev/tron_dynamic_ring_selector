# Validation evidence

Target source: official `sf2e-1.6.1` release, system ID `sf2e`, commit
`28d9d156f252d084371d994dc359509b49eadf18`. No installed system or licensed Foundry
runtime was available. Official API website access was blocked by the live network
policy. See SOURCE-INSPECTION.md for the exact current source/declaration evidence.

## Completed

- **31 Node tests passed**, zero failures/skips: 26 policy/controller tests, four
  shader-source/math tests and one mocked registration/batch contract test.
- JavaScript syntax checks passed for all five runtime modules.
- All eight supplied PNGs were inspected for dimensions/alpha and hashed; no ZIP
  scripts were executed. The shared atlas preserves the blue source RGBA exactly.
- Mask checks: no fully transparent pixel or dark source pixel (max RGB <=90) is
  selected for animation. Native assets are included, not generated at runtime.
- **Standalone WebGL2 custom-function test passed for eight colors.** Each color
  compared 233,099 opaque dark housing pixels and 185,057 bright illumination pixels.
  Dark housing pixels were identical at peak/trough. Source alpha was unchanged at
  every pixel. Three-second seam endpoints and disabled-animation frames matched
  peak frames exactly. Illumination trough/peak ratios were approximately 0.55;
  hue errors from framebuffer quantization were below 0.002 in normalized chroma.
- WebGL test records the browser version and exact shader/atlas hashes in
  `webgl-results.json`. The local fixture server/browser are closed after testing.
- Manual-install archive layout and ZIP integrity are checked by `tools/package.py`.
- RC3 reproduces RC2's atlas-edge failure and adds 36 scaled-UV edge checks using
  linear and mipmapped filtering at 64/128/256 pixels. Border/background pixels
  remain transparent in all cases after the fix. The test now records the native
  spritesheet JSON hash as well as the shader and atlas PNG hashes.

## Not established by those tests

The WebGL fixture compiles the actual custom ring function with a minimal scaffold,
not Foundry's entire proprietary canvas shader. Registration tests use a mocked
core implementation. They do not establish successful native asset loading, full
shader linkage, native portrait compositing/fit, actual actor-sheet buttons,
Foundry duplication/compendium import, or real connected-client update behavior.

The module guards the actual loaded shader's signatures at registration time, but
the complete Foundry v14 / sf2e 1.6.1 manual checklist still needs to run. No Foundry
version is marked `verified`. Release publication does not establish in-game compatibility.
