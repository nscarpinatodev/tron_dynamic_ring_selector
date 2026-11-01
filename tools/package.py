"""Build a manual-install archive without asserting Foundry runtime verification."""
import json
from pathlib import Path
import zipfile

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / "module.json").read_text())
files = [root / "module.json", root / "README.md"]
for directory in ("scripts", "styles", "lang", "docs", "assets"):
    files += sorted(path for path in (root / directory).rglob("*") if path.is_file())
for filename in manifest["esmodules"] + manifest["styles"] + [entry["path"] for entry in manifest["languages"]]:
    if not (root / filename).is_file():
        raise SystemExit(f"Missing declared package file: {filename}")
for filename in ("assets/tron-ring.json", "assets/tron-ring.png"):
    if not (root / filename).is_file():
        raise SystemExit(f"Missing native artwork: {filename}")
output = root / "dist" / "tron-identity-rings.zip"
output.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as archive:
    for path in files:
        archive.write(path, Path(manifest["id"]) / path.relative_to(root))
with zipfile.ZipFile(output) as archive:
    assert archive.testzip() is None
print(output)
