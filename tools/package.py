"""Build a manual-install archive without asserting Foundry runtime verification."""
import json
import hashlib
import shutil
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
version = manifest['version']
output = root / "dist" / f"tron-identity-rings-{version}.zip"
output.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as archive:
    for path in files:
        entry = zipfile.ZipInfo(str(Path(manifest["id"]) / path.relative_to(root)), (2026, 1, 1, 0, 0, 0))
        entry.compress_type = zipfile.ZIP_DEFLATED
        entry.external_attr = 0o100644 << 16
        archive.writestr(entry, path.read_bytes())
with zipfile.ZipFile(output) as archive:
    assert archive.testzip() is None
dist = output.parent
shutil.copyfile(output, dist / "tron-identity-rings.zip")
shutil.copyfile(root / "module.json", dist / "module.json")
checksums = []
for path in [output, dist / "module.json"]:
    checksums.append(f"{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.name}\n")
(dist / "SHA256SUMS").write_text(''.join(checksums))
(dist / "tron-identity-rings.zip.sha256").write_text(
    hashlib.sha256(output.read_bytes()).hexdigest() + "  tron-identity-rings.zip\n")
print(output)
