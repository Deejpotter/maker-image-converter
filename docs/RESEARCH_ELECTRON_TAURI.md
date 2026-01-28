# Research: Electron vs. Tauri vs. Python-native

Summary
- Recommendation: Use **Electron + sharp** for this project.
  - Rationale: `sharp` has prebuilt native binaries using libvips, making image operations (resize, convert to WebP, composite background) simple and reliable across Windows machines without requiring Visual C++ build tools. Electron lets us build a friendly GUI and package a Windows installer (.exe) for non-technical users.

Key Findings and Links
- Electron
  - Packaging: Electron has mature packaging workflows (electron-builder) and docs: https://www.electronjs.org/docs/latest/tutorial/tutorial-packaging
  - Pros: Large ecosystem, easy GUI development with web tech, many packaging options and a straightforward developer experience.
  - Cons: Larger final bundle size compared to Rust-based options.

- sharp (Node image library)
  - Docs: https://sharp.pixelplumbing.com/
  - Pros: High-performance resizing, WebP conversion, composite/background support, prebuilt binaries for libvips.

- Tauri
  - Smaller bundled app, uses system webview, requires Rust toolchain for native components or sidecars.
  - Sidecar approach possible to run Python, but adds complexity for bundling Python and cross-platform distribution.
  - Docs/examples: https://v2.tauri.app/develop/sidecar/

- Python-native approach
  - Tools: Pillow + PyInstaller can produce a .exe, but Pillow may need system build tools on some setups. This increases friction for reproducible builds.
  - Alternative: Use system `cwebp` or ImageMagick as bundled binaries and call them from Python to avoid building Pillow.

Recommendation rationale
- Priority: minimize friction for building and distributing a single Windows installable app for non-technical users.
- Sharp + Electron reduces dependency compilation issues and leverages mature packaging and GUI tooling. The tradeoff is larger installer size, but that is acceptable for the target audience.

Next steps
1. Confirm approach (Electron + sharp).
2. Scaffold Electron project, add `sharp` implementation for conversion, add GUI for selecting a folder and starting the batch operation.
3. Add packaging and CI to produce a Windows installer (.exe).

Resources
- Electron packaging docs: https://www.electronjs.org/docs/latest/tutorial/tutorial-packaging
- sharp docs: https://sharp.pixelplumbing.com/
- Tauri sidecar docs: https://v2.tauri.app/develop/sidecar/
- `sharp` compositing reference: https://sharp.pixelplumbing.com/api-composite/