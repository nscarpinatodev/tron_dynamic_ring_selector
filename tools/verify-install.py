"""Follow the public manifest to its actual ZIP, as an installer would."""
import argparse
import io
import json
import urllib.request
import zipfile
from release_contract import validate_manifest

parser = argparse.ArgumentParser()
parser.add_argument('url')
parser.add_argument('--expected-version', required=True)
args = parser.parse_args()

def download(url):
    with urllib.request.urlopen(url, timeout=45) as response:
        data = response.read(64 * 1024 * 1024 + 1)
    if len(data) > 64 * 1024 * 1024:
        raise ValueError('Unexpectedly large installation resource')
    return data

manifest = json.loads(download(args.url))
version = validate_manifest(manifest)
assert version == args.expected_version, (version, args.expected_version)
with zipfile.ZipFile(io.BytesIO(download(manifest['download']))) as archive:
    assert archive.testzip() is None
    bundled = json.loads(archive.read('tron-identity-rings/module.json'))
    assert bundled == manifest, 'Downloaded manifest and packaged manifest differ'
    for path in bundled['esmodules'] + bundled['styles'] + [entry['path'] for entry in bundled['languages']]:
        assert f'tron-identity-rings/{path}' in archive.namelist(), path
print(f'Live installation chain verified: manifest → ZIP → matching {version} module and entry points.')
