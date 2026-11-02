"""Foundry installation metadata shared by local, CI, and live-download checks."""
import re

REPOSITORY = 'https://github.com/nscarpinatodev/tron_dynamic_ring_selector'
MANIFEST_URL = 'https://raw.githubusercontent.com/nscarpinatodev/tron_dynamic_ring_selector/main/module.json'

def validate_manifest(manifest):
    version = manifest.get('version', '')
    if not re.fullmatch(r'\d+\.\d+\.\d+-rc\.\d+', version):
        raise ValueError('Expected a release-candidate version')
    if manifest.get('id') != 'tron-identity-rings':
        raise ValueError('Unexpected module ID')
    if manifest.get('manifest') != MANIFEST_URL:
        raise ValueError('Missing or incorrect testing-channel manifest URL')
    expected = f'{REPOSITORY}/raw/refs/tags/v{version}/dist/tron-identity-rings-{version}.zip'
    if manifest.get('download') != expected:
        raise ValueError('Missing or incorrect version-pinned ZIP download URL')
    return version
