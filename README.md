# TRON Identity Rings

**Testing release: 0.1.0-rc.3.** This is the third 0.1 release candidate, intended
for a disposable test world. Read the [RC3 testing notes](docs/RELEASE-0.1.0-rc.3.md)
before installing. It is not a verified stable release.

Native Dynamic Token Ring style and campaign classifications for **Foundry v14**
with **Starfinder Second Edition `sf2e` 1.6.1**. No additional module dependencies.

**In-game integration has not been tested.** Policy/controller tests and a standalone
WebGL2 test of the custom ring function are provided. The manifest deliberately has
no `verified` version. Use a test world and the [manual checklist](docs/MANUAL-TESTS.md).

## Installation through Foundry

In Foundry Setup, open **Add-on Modules → Install Module** and paste this into
**Manifest URL**:

```text
https://raw.githubusercontent.com/nscarpinatodev/tron_dynamic_ring_selector/main/module.json
```

This is the testing update channel. Its manifest includes a version-pinned ZIP
`download` URL. Existing RC1 installations need this manifest URL supplied once,
using Install Module after removing the old module installation if necessary.
Back up the world first; this does not require deleting the world.

## Manual installation

1. Extract `tron-identity-rings-0.1.0-rc.3.zip` into Foundry's user-data `Data/modules` folder,
   resulting in `Data/modules/tron-identity-rings/module.json`.
2. Enable **TRON Identity Rings** in a v14 / `sf2e` 1.6.1 test world.
3. In core world settings, choose **TRON Identity Rings** as the Dynamic Token Ring
   style. Reload if core settings request it. Activation does not select the style
   or migrate existing actors/tokens.
4. Open a PC/NPC sheet and use **TRON Classification** in its header. Set a
   classification; then place a token. Use the GM bulk preview for existing tokens.

The `manifest` URL tracks the testing channel on main. The `download` URL targets
the ZIP committed to its exact release tag, so installation works independently
of when GitHub Actions creates a Releases entry. Release assets contain the same ZIP.
The system release declares Foundry minimum 14.361 / verified 14.369 / maximum 14;
those are **system declarations**, not this module's runtime verification.

**World-style limitation:** Foundry selects one native ring configuration for the
world. Choosing TRON changes the design of every token already displaying a native
ring, including tokens managed by other packages. An opt-out cannot exempt its
native ring from that global design choice. Existing rings without TRON's managed
marker delegate coloring/effects to core; only module-managed rings use the custom
illumination pulse. The module never changes another package's selected style.

If the loaded core shader differs from the inspected v14 signatures, registration
is refused with a visible error, and appearance application stays disabled. Do not
work around that by disabling the checks; report the Foundry build and browser error.

## Artwork and pulse

The included native JSON and lossless atlas use the original blue disc as a shared
design: its graphite housing, illuminated rails, cardinal details and source alpha
are preserved. A derived light mask identifies illumination separately. The shader
neutralizes blue light chroma within that mask and applies the selected hue, leaving
dark housing pixels unchanged. No videos, rotating geometry, size/position animation,
portrait recoloring, or per-frame document writes are used.

The pulse has a default three-second cosine cycle, from full brightness to 55% and
back. World module settings expose **illumination animation**, **cycle in seconds**
(1–12), and **pulse depth** (0–1). Turning animation off or enabling core canvas
photosensitive mode keeps illumination steady at full brightness. Server time aligns
the phase across clients to the precision of core's time synchronization. The mask
is derived from the source; visually inspect it at your preferred token sizes.

The native ring background frame is transparent; the module never substitutes a
portrait or changes its path. Actual native portrait clipping/compositing and size
fit remain on the in-game checklist.

## Classification and precedence

Actor sheet **TRON Classification** supports Automatic, explicit classifications,
and Unmanaged. Token configuration header **TRON Classification — token override**
supports Inherit, explicit classifications, and Unmanaged. Owners can edit their
actors/tokens; the bulk/settings controls are GM-only.

Resolution is exactly:

1. Explicit token override, including token opt-out.
2. Explicit actor classification, or actor opt-out.
3. First matching enabled automatic rule by numeric priority.
4. Configured fallback, initially **unchanged**.

An explicit token classification wins even over an actor opt-out. Unknown flag
values leave appearance unchanged. Opt-out stops policy updates; it does not restore
earlier ring settings. Previously managed tokens keep their last hue and become
steady when their resolved appearance is unmanaged.

| Classification key | Campaign classification | Default color |
| --- | --- | --- |
| `protector` | User-loyal / protector | Blue `#28aaff` |
| `loyalist` | Rogue-authority loyalist | Red `#ff3038` |
| `search` | Search program / hacker / architect | Yellow `#ffe43b` |
| `corrupted` | Corrupted / repurposed program | Orange `#ff8b26` |
| `iso` | ISO | White `#ffffff` |
| `military` | Military / defense | Green `#48ed69` |
| `outland` | Outland / healthcare | Teal `#25dfcf` |
| `utility` | Utility / information handler | Purple `#b16bff` |

Actor/token choices use `flags.tron-identity-rings.classification`; the application
marker uses `flags.tron-identity-rings.managed`. No Starfinder schema changes.
Normal actor duplication and compendium export/import retain flags in serialized
data; actual Foundry duplication/import must still be checked. Classify reusable
actor templates explicitly, then duplicate/export them.

## Configurable rules, priority and palette

GM: Module Settings → **TRON Classification and palette**. A validated JSON editor
shows the ordered priority list. All eight palette entries are editable; swap
`military` and `outland` colors to reverse green and teal.

Rules start empty: system data does not establish TRON allegiance. Use explicit
templates instead of guessing. Supported exact, case-sensitive match sources:

- `ancestry.slug`: PC ancestry embedded item `system.slug`.
- `background.slug`: PC background embedded item `system.slug`.
- `traits`: PC/NPC `system.traits.value` entries.

Rules cannot inspect names, biographies, arbitrary property paths, or disposition.
Lower numeric priority wins; ties use array order. All matching rules are shown in
the bulk preview. No hierarchy among origin, occupation and allegiance is invented.

Example rule, **only if you created an ancestry with this exact slug**:

```json
{
  "label": "Campaign ISO ancestry",
  "priority": 10,
  "actorType": "character",
  "source": "ancestry.slug",
  "value": "tron-iso",
  "classification": "iso",
  "enabled": true
}
```

Add rules to the `rules` array. `actorType` is `character`, `npc` or `any`.
`fallback` is `unchanged` or a classification key. Saving policy does not launch a
world migration. Use bulk preview to review and apply it to existing documents.

## GM bulk action

Module Settings → **TRON bulk classification → Preview and apply**. Choose Keep
classifications or a proposed classification, review resolution/conflicts, and
explicitly select rows. No rows start selected; cancel/preview writes nothing.

Template rows edit actor flags. Scene-token rows edit token overrides only;
Automatic on a scene row means inherit its current actor. Linked copies reflect
subsequent template changes, while their explicit overrides/opt-outs win.
Appearance reconciliation is performed by the elected GM; when another GM is
elected, use that client's bulk action for a Keep-classifications reconciliation.

## Linked and unlinked tokens

- New tokens receive their resolved ring settings during their own creation request.
- World actor changes update the prototype and linked tokens across scenes.
- Existing unlinked tokens retain independent synthetic actor settings. Edit the
  synthetic actor or its token override; changing it never edits the base actor or
  sibling copies. Future copies use the updated base template.
- Post-update writes come from the active GM with the lowest ID using a stable
  lexical ordering. Serial queues, field diffs and internal hook markers avoid
  duplicate/recursive writes. Animation runs locally without document writes.
- Appearance patches own only `ring.enabled`, `ring.colors.ring` and the module's
  marker flag. Portrait/subject paths, scale, size, vision, disposition, background
  color and effect masks are preserved. The custom style handles the managed ring
  color rather than applying core's radial pulse/gradient to its housing.
- Activation and settings saves never automatically migrate the world. Events
  missed while every GM is offline require a deliberate bulk reconciliation.

## Development and validation

Use the existing checkout; tasks are already isolated. No worktree is needed.
Node >=22 and Python 3 are sufficient to test/package the checked-in artifacts.
There are no npm dependencies or installation step.

```sh
npm test
npm run check
npm run package
```

`dist/tron-identity-rings-0.1.0-rc.3.zip` includes the module directory and required
resources. The unversioned ZIP is an identical convenience copy. `dist/SHA256SUMS`
checksums the versioned ZIP and standalone manifest. Tagged release candidates run
tests in GitHub Actions before a GitHub prerelease is published.
Asset rebuilding optionally uses `requirements-assets.txt` and:
`python3 tools/build-assets.py /path/to/TRON-Identity-Disc-Rings.zip`.
Uploaded ZIP scripts are never executed.

`node tools/test-webgl.mjs` runs an offline local Chromium/WebGL2 test and saves
`docs/webgl-results.json` with artifact hashes. It uses a temporary local HTTP
server and closes it afterward; it is not a Foundry service or preview.

31 Node policy/controller/source/registration-contract tests cover precedence,
conflicts, opt-outs, fallback, serialization, updates, creation, synthetic scope,
GM election, idempotence, pulse math, and shader compatibility rejection. The native
registration contract test uses a mocked core shader; it does not validate a real
Foundry canvas. See [source inspection](docs/SOURCE-INSPECTION.md) and the
[manual checklist](docs/MANUAL-TESTS.md) for exact evidence and remaining checks.
