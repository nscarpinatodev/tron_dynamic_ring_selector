# TRON Identity Rings 0.1.0-rc.3

Fixes a reproduced rectangular border caused by sampling neighboring atlas data
outside the ring image. RC2's illumination mask was an opaque rectangle immediately
next to both the ring and background frames. Filtered/scaled UV sampling could draw
that rectangle around the token. The original full-resolution, nearest-neighbor
test did not cover this failure.

## Changes

- Store illumination coverage in mask alpha, eliminating the opaque mask rectangle.
- Clip ring samples to their source frame before either managed or native coloring.
- Use an isolated 1×1 transparent background frame with empty space around it.
- Preserve the original source artwork, portrait path, geometry and classification
  flags. No actor/token migration is required.

## Update

In Foundry Setup, update **TRON Identity Rings** using the testing manifest:

```text
https://raw.githubusercontent.com/nscarpinatodev/tron_dynamic_ring_selector/main/module.json
```

Confirm version `0.1.0-rc.3`, then reload the world in every connected browser so the
new shader and atlas are loaded. If the old texture persists, hard-refresh the
browser to clear its cached module assets. Keep the TRON native ring style selected.

Manual ZIP: `tron-identity-rings-0.1.0-rc.3.zip`. Target remains Foundry v14 / sf2e 1.6.1.

## Verification

The added scaled-UV/filtering regression failed against RC2 with visible border
pixels (`docs/edge-regression-before.json`). With the fix, 36 edge cases cover
64/128/256-pixel rendering, linear/mipmap filtering, managed/animated/native paths,
and transparent backgrounds. All tested border/background pixels are transparent.
The existing eight-color pulse checks still preserve source alpha, dark housing,
hue, seamless timing and disabled-animation behavior. Release validation checks
the exact tested shader, atlas PNG and spritesheet JSON hashes.

This is standalone WebGL evidence, not a licensed Foundry runtime test. Please
check the reported border in-world at several zoom levels after updating.
