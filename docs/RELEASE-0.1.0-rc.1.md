# TRON Identity Rings 0.1.0-rc.1

First **0.1 release candidate for testing**, not a verified stable release.
Target: Foundry VTT v14 (minimum 14.361), Starfinder Second Edition `sf2e` **1.6.1**.
No additional module dependencies. No new gameplay or renderer changes from the
initial 0.1 implementation: this release labels and packages that build for testing.

## Included

- Native identity-disc atlas/JSON and guarded registration of the TRON ring style.
- Eight configurable classification colors, explicit actor and token overrides,
  opt-outs, prioritized structured matching rules, and unchanged fallback.
- A shared illumination mask with a three-second pulse, adjustable period/depth,
  disable-animation setting, and core photosensitive-mode handling.
- GM bulk preview/apply and deliberate linked/unlinked actor synchronization.
- Versioned installation ZIP, standalone `module.json`, and `SHA256SUMS`.

## Install and upgrade

1. Back up your world and use a disposable copy for RC testing. Stop the world
   before replacing an existing module installation.
2. Extract `tron-identity-rings-0.1.0-rc.1.zip` into Foundry's user-data
   `Data/modules` directory. The manifest must be at
   `Data/modules/tron-identity-rings/module.json`, not inside a second nested folder.
3. Start the test world and enable **TRON Identity Rings — 0.1 RC1**. Confirm the
   module version is `0.1.0-rc.1`.
4. Select **TRON Identity Rings** manually in the core Dynamic Token Ring style
   setting. The module does not replace your selected style or migrate the world
   on activation. Core's selected style applies to all native rings in that world.
5. Set **TRON Classification** on a PC or NPC, then place a new token. Use the
   GM bulk preview for existing tokens.

The standalone manifest is supplied for inspection; it has no hosted automatic
installation/update URL. Install the ZIP manually. To verify downloads on Linux or
macOS with sha256sum installed, place `SHA256SUMS`, `module.json`, and the versioned
ZIP in the same directory and run `sha256sum --check SHA256SUMS`.

## Required tester checks

Run the full [manual checklist](https://github.com/nscarpinatodev/tron_dynamic_ring_selector/blob/v0.1.0-rc.1/docs/MANUAL-TESTS.md), especially:

1. Style registration and selection, PC/NPC classification controls, and new tokens.
2. All eight colors, transparent and opaque portraits, several token sizes, and
   a full pulse cycle: only illumination changes; housing, geometry and portrait stay steady.
3. Token > actor > ordered rule > fallback precedence, conflicting rules and opt-outs.
4. A base actor with linked tokens in two scenes and two independent unlinked copies.
   Editing one synthetic actor must affect only its own token.
5. Two connected GM clients plus a player: no duplicate or looping document updates,
   and no animation-frame document writes.
6. Disable animation, change period/depth, and test core photosensitive mode.

## Validation and known limits

31 Node tests cover policy/controller logic, shader source/math, and a mocked
registration/batch contract. The standalone WebGL2 custom-ring-function test passed
for all eight colors, including unchanged housing pixels, exact alpha preservation,
seam endpoints, hue stability and disabled animation. Its recorded source/atlas
hashes are checked when this candidate is packaged.

**A licensed Foundry runtime was not available.** Native loading, full core shader
linkage, portrait composition/fit, sheet hooks, actual document duplication/import,
and live multiplayer behavior remain unverified. Official API website access was
blocked during the original inspection; exact system release source, current v14
declarations and a current public v14 implementation were inspected. Runtime shader
signature guards refuse unknown layouts instead of silently enabling a mismatched
shader. This can make the style unavailable on an unrecognized v14 build.

## Report a test result

Report in the repository's Issues tab with: module version `0.1.0-rc.1`, exact
Foundry build, system version, browser/version, selected native style, actor type,
linked/unlinked status, classification/override, steps, expected/actual result, and
relevant browser-console errors. For multiplayer issues include connected GM/player
counts. Do not include license keys, tokens, private world data, or credentials.

## Rollback

Disable the module and restore the previous module folder/world backup if needed.
Disabling the module does not undo classification flags or prior `ring.enabled` /
`ring.colors.ring` writes. Select your previous native ring style manually. Use the
world backup to restore the exact prior token settings.
