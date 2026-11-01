# Native ring artwork

Generated from the user's `TRON-Identity-Disc-Rings.zip`. No uploaded scripts were
executed. The eight PNG members were inspected and hashed in `inventory.json`.

- `tron-ring.png`: 4096×2048 lossless shared atlas. First 1254×1254 frame is the
  unchanged blue source, including its original RGBA bytes. Second frame is the
  derived illumination mask; third is a transparent native background frame.
- `tron-ring.json`: native/Pixi spritesheet metadata, one gridTarget entry with
  a paired `-bkg` frame. Other token sizes use core's nearest-size behavior.
- `source-blue.png`: source inspection aid, not an additional portrait texture.
- `illumination-mask.png`: inspection aid. Bright blue illumination and nearby
  white-hot cores are selected; all source pixels with max RGB <= 90 and all
  fully transparent source pixels have exactly zero mask.

The shared blue design supplies the graphite housing, concentric rails and cardinal
details for all eight palette colors. This is not eight baked color/video variants.
The shader neutralizes blue chroma only where the light mask is nonzero and applies
the configured hue there. The dark housing remains the unchanged source. The mask
is derived heuristically and should be visually reviewed in Foundry at all token sizes.

Rebuild: `python3 tools/build-assets.py /path/to/TRON-Identity-Disc-Rings.zip` after
installing `requirements-assets.txt` in a development virtual environment if needed.
The PNG atlas and JSON are already included; end users need no Python dependencies.
