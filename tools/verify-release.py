"""Verify candidate metadata, archive contents, checksums, and retained GPU evidence."""
import hashlib
import json
import re
import zipfile
from pathlib import Path
from release_contract import validate_manifest

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'module.json').read_text())
version = manifest['version']
validate_manifest(manifest)
assert re.fullmatch(r'\d+\.\d+\.\d+-rc\.\d+', version)
assert json.loads((root / 'package.json').read_text())['version'] == version
assert 'verified' not in manifest['compatibility']
assert manifest['relationships']['systems'][0]['id'] == 'sf2e'
assert manifest['relationships']['systems'][0]['compatibility']['maximum'] == '1.6.1'
dist = root / 'dist'
archive_path = dist / f'tron-identity-rings-{version}.zip'
assert archive_path.read_bytes() == (dist / 'tron-identity-rings.zip').read_bytes()
assert (dist / 'module.json').read_bytes() == (root / 'module.json').read_bytes()
for line in (dist / 'SHA256SUMS').read_text().splitlines():
    expected, name = line.split('  ', 1)
    assert hashlib.sha256((dist / name).read_bytes()).hexdigest() == expected
with zipfile.ZipFile(archive_path) as archive:
    assert archive.testzip() is None
    names = archive.namelist()
    assert len(names) == len(set(names))
    assert f'tron-identity-rings/docs/RELEASE-{version}.md' in names
    for name in names:
        assert name.startswith('tron-identity-rings/') and '..' not in Path(name).parts
        relative = name.removeprefix('tron-identity-rings/')
        assert archive.read(name) == (root / relative).read_bytes(), relative
    assert not any(name.endswith('.webm') for name in names)
report = json.loads((root / 'docs/webgl-results.json').read_text())
assert report['status'] == 'PASS' and len(report['reports']) == 8
for filename, key in [('scripts/shader.js', 'shaderSha256'), ('assets/tron-ring.png', 'atlasSha256')]:
    assert hashlib.sha256((root / filename).read_bytes()).hexdigest() == report[key]
print(f'{version}: metadata, ZIP contents, checksums and unchanged GPU-tested artifacts verified.')
