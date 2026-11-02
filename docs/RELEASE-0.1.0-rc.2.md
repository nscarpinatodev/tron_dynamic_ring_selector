# TRON Identity Rings 0.1.0-rc.2

Fixes Foundry manifest installation. RC1 shipped without `download` and `manifest`
URLs, so Foundry could not install it using its published manifest. RC2 adds a
version-pinned ZIP URL and a testing-channel update manifest. Runtime behavior,
artwork and shaders are unchanged from RC1; this is still an unverified testing build.

## Install

Foundry Setup → Add-on Modules → Install Module → Manifest URL:

```text
https://raw.githubusercontent.com/nscarpinatodev/tron_dynamic_ring_selector/main/module.json
```

Target: Foundry v14 (minimum 14.361), `sf2e` 1.6.1. The channel currently provides
RC2. After installation, enable the module and select the TRON native ring style
manually. Test in a backed-up disposable world.

RC1 has no update-manifest URL, so supply the above URL to install RC2. If Foundry
requires removal of the existing module first, remove only the module installation,
then reinstall; do not delete your world. Confirm version `0.1.0-rc.2` afterward.

Manual installation remains supported using `tron-identity-rings-0.1.0-rc.2.zip`.
The manifest downloads that exact ZIP from its immutable Git tag. This makes it
available as soon as the tag is pushed, independently of GitHub Actions scheduling.
GitHub Release assets and the ZIP inside the tag contain identical module files.

## Release process fixes

- Packaging and CI reject missing manifest/download URLs, wrong-version ZIP URLs,
  and repository source archives used in place of the installation package.
- Four regression tests cover the installation metadata contract, including RC1's
  missing-download failure.
- The standalone and packaged manifests must match exactly.
- The release workflow follows the published manifest's download URL and validates
  the resulting ZIP and entry points after publishing.

The existing 31 Node tests and eight-color standalone GPU evidence remain relevant.
The shader and atlas hashes are unchanged. No Foundry runtime was available; native
loading, canvas composition and live multiplayer checks remain unverified. Follow
the [manual checklist](https://github.com/nscarpinatodev/tron_dynamic_ring_selector/blob/v0.1.0-rc.2/docs/MANUAL-TESTS.md).
