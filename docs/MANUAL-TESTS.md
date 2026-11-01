# Focused Foundry validation checklist

Not run: no Foundry runtime was available. Use a disposable v14 / sf2e 1.6.1 world.
Keep a world backup. These checks validate the provided renderer inside Foundry.

## Controls and classification

- Enable the module: it registers a selectable style, does not change the selected
  world style, and does not change existing tokens. On an unsupported shader build,
  it reports refusal to register instead of rendering a partly working substitute.
- Both PC and NPC sheets show TRON Classification; owners can save; observers
  cannot edit. Token configuration exposes a separate override control.
- Explicit actor classification persists through duplication and compendium
  export/import. Place a token from a duplicated/imported template.
- Exercise each classification, token override, actor/token opt-out, Automatic,
  and unchanged fallback. Invalid/unknown flags leave existing appearance alone.
- Create two matching rules. Lower priority wins; equal priorities follow list
  order; preview lists both matches. Explicit token and actor choices win over rules.
- Test exact ancestry/background slugs on PCs, traits on PCs/NPCs, missing/null
  slug, and an NPC with only biography text. Text/name/disposition must not match.
- Swap military/outland colors and inspect the preview. Invalid JSON, invalid
  colors, unknown sources, and invalid priorities must not save.
- Bulk preview itself writes nothing. No rows start selected. Actor template
  rows write actor flags; scene rows write token overrides only. Cancel writes nothing.

## Document synchronization

- Change a world actor: its prototype and linked tokens across two scenes update;
  explicit token overrides and opt-outs remain authoritative.
- Place new linked and unlinked tokens. Confirm source preparation applies the
  resolved classification before first draw, including when a player places one.
- Create two unlinked copies. Edit one synthetic actor: only that token changes,
  never the base actor, its prototype, or the sibling unlinked copy.
- Edit the base actor: existing unlinked copies remain independent; newly placed
  copies inherit the new template classification.
- Change a background/ancestry item slug or creature traits: automatic resolution
  updates. Add/delete relevant items and verify the same.
- Open two GM clients plus a player. Check document update traffic: one elected
  GM writes, no recursive hook loop, no duplicate writes, no animation-frame writes.
- Disconnect the elected GM, then edit a classification with another active GM.
  Confirm writer handoff. No all-world synchronization happens on connection alone.
- Snapshot portraits, token dimensions, subject texture/scale, vision, disposition,
  effects and background color before edits; verify they are identical afterward.

## Native ring and canvas

- Style appears in native core ring settings. Enabling the module does not select
  it or replace another package's style. Select TRON manually and reload as needed.
- Check all eight colors, tiny/medium/large/huge token sizes, transparent portraits,
  ordinary portraits, tokens overlapping, and multiple tokens on different clients.
- Compare against original PNGs: graphite housing, concentric illuminated rails,
  cardinal lights, edges and transparent gaps retain the design.
- Inspect a three-second cycle frame by frame: only illuminated pixels change
  brightness; hue stays fixed, housing stays steady. Geometry, position and rotation
  are stationary. Portrait is neither tinted nor pulsed.
- Change speed and depth. Disable animation: illumination stays steady. Respect
  any verified core photosensitivity control. Confirm no video textures are used.
- Native world style limitations: inspect an opted-out token already using a native
  ring when the global style changes, and document the unavoidable effect.
- Opt out a previously managed token: it retains its last assigned color and becomes
  steady; later actor classification changes must not update it. Existing rings
  without the module's managed marker use core coloring/effects with the TRON design.
- Watch document traffic and browser errors with many tokens for several cycles.
  Canvas animation must not write actor/token documents at all.
