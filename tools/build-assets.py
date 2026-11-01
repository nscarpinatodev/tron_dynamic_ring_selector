"""Deterministically pack the user's unchanged source and derived illumination mask.

Only reads the named PNG members; never executes scripts supplied in the ZIP.
"""
import hashlib
import json
from pathlib import Path
import sys
import zipfile

import numpy as np
from PIL import Image, ImageFilter
from io import BytesIO

root = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1])
colors = ["blue", "red", "yellow", "orange", "white", "green", "teal", "purple"]
records = []
with zipfile.ZipFile(source) as archive:
    images = {}
    for color in colors:
        member = f"TRON-Identity-Disc-Rings/static/identity-disc-{color}.png"
        data = archive.read(member)
        image = Image.open(BytesIO(data)).convert("RGBA")
        assert image.size == (1254, 1254)
        assert image.getpixel((627, 627))[3] == 0 and image.getpixel((0, 0))[3] == 0
        images[color] = image
        records.append({"color": color, "member": member, "sha256": hashlib.sha256(data).hexdigest(),
                        "dimensions": list(image.size), "centerAlpha": 0, "cornerAlpha": 0})

# One shared design: blue original, unchanged graphite/geometry/alpha. Other hues
# use the same shape through the shader. Bright nearby chromatic light identifies
# white-hot cores too; dark metal (max RGB <= 90) is explicitly excluded.
image = images["blue"]
pixels = np.asarray(image).astype(np.float32)
rgb = pixels[:, :, :3]
brightness = rgb.max(axis=2)
seed = np.clip((rgb[:, :, 2] - rgb[:, :, 0] - 15) / 55, 0, 1)
seed *= np.clip((brightness - 90) / 60, 0, 1)
expanded = np.asarray(Image.fromarray(np.round(seed * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9))) / 255
mask = expanded * np.clip((brightness - 90) / 70, 0, 1)
mask[pixels[:, :, 3] == 0] = 0
mask_bytes = np.round(mask * 255).astype(np.uint8)
mask_image = Image.fromarray(np.dstack([mask_bytes] * 3 + [np.full(mask_bytes.shape, 255, dtype=np.uint8)]))

atlas = Image.new("RGBA", (4096, 2048))
atlas.paste(image, (0, 0))  # paste without alpha mask: preserve every RGBA byte
atlas.paste(mask_image, (1254, 0))
assets = root / "assets"
assets.mkdir(exist_ok=True)
atlas.save(assets / "tron-ring.png", optimize=True)
image.save(assets / "source-blue.png", optimize=True)
mask_image.save(assets / "illumination-mask.png", optimize=True)

def frame(x, **extra):
    return {"frame": {"x": x, "y": 0, "w": 1254, "h": 1254},
            "rotated": False, "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": 1254, "h": 1254},
            "sourceSize": {"w": 1254, "h": 1254}, "anchor": {"x": 0.5, "y": 0.5}, **extra}

# Only the ring has gridTarget, so there is one native size entry. Core selects
# the nearest supported entry for every grid size; all sizes share this design.
sheet = {"frames": {"tron-ring": frame(0, gridTarget=1), "tron-ring-bkg": frame(2508)},
         "meta": {"app": "TRON Identity Rings", "version": "1", "image": "tron-ring.png",
                  "format": "RGBA8888", "size": {"w": 4096, "h": 2048}, "scale": "1"},
         "config": {"defaultColorBand": {"startRadius": 0, "endRadius": 0}}}
(assets / "tron-ring.json").write_text(json.dumps(sheet, indent=2) + "\n")
inventory = {"archiveSha256": hashlib.sha256(source.read_bytes()).hexdigest(), "sources": records,
             "sharedDesign": "blue", "maskOffsetUV": [1254 / 4096, 0],
             "darkMetalMaskMax": int(mask_bytes[brightness <= 90].max()),
             "transparentPixelMaskMax": int(mask_bytes[pixels[:, :, 3] == 0].max()),
             "maskedPixels": int((mask_bytes > 0).sum())}
(assets / "inventory.json").write_text(json.dumps(inventory, indent=2) + "\n")
assert inventory["darkMetalMaskMax"] == 0 and inventory["transparentPixelMaskMax"] == 0
assert np.array_equal(np.asarray(atlas)[:1254, :1254], np.asarray(image))
print(json.dumps(inventory, indent=2))
