import copy
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('release_contract', ROOT / 'tools/release_contract.py')
contract = importlib.util.module_from_spec(spec)
spec.loader.exec_module(contract)

class InstallManifestTests(unittest.TestCase):
    def setUp(self):
        self.manifest = json.loads((ROOT / 'module.json').read_text())

    def test_current_manifest_is_installable(self):
        self.assertEqual(contract.validate_manifest(self.manifest), self.manifest['version'])

    def test_rc1_missing_download_is_rejected(self):
        del self.manifest['download']
        with self.assertRaisesRegex(ValueError, 'download URL'):
            contract.validate_manifest(self.manifest)

    def test_missing_update_manifest_is_rejected(self):
        del self.manifest['manifest']
        with self.assertRaisesRegex(ValueError, 'manifest URL'):
            contract.validate_manifest(self.manifest)

    def test_wrong_version_or_source_archive_is_rejected(self):
        for url in [contract.REPOSITORY + '/archive/refs/heads/main.zip',
                    self.manifest['download'].replace(self.manifest['version'], '0.0.0-rc.0'),
                    'http://example.com/module.zip', '', None]:
            with self.subTest(url=url):
                modified = copy.deepcopy(self.manifest)
                modified['download'] = url
                with self.assertRaisesRegex(ValueError, 'download URL'):
                    contract.validate_manifest(modified)
