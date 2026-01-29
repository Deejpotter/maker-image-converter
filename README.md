# Maker Image Converter

A simple command-line tool to batch convert images to WebP format with white background padding. See `USAGE.md` for usage and examples.

## Features

- Convert any image folder to WebP (800x800px, white background)
- Single installer (.exe) for Windows users
- Preserves original folder structure under `webp/` output directory

## Tech stack

- **Frontend/Packaging:** Electron (cross-platform desktop app)
- **Image processing:** `sharp` (Node.js image library using libvips)
- **Packaging tool:** `electron-builder` (create Windows installer / portable apps)

## Usage (recommended)

This project is intended to be used from the terminal. The Node-based CLI is the primary and supported workflow for batch conversions.

The CLI exposes four commands: `convert`, `overlay`, `diagonal`, and `full` (full runs all steps):
Behavior notes:

- **Watermark defaults**: If you leave `--watermark` blank the app will use the included watermark PNG by default (no additional action required).
- **Sizing**: Center overlay is scaled to fill the output width (fits the 800×800 canvas). The diagonal overlay is scaled to span the diagonal (corner-to-corner).
- **Opacity**: Overlay opacity is applied exactly as provided (default 0.3). You can change it via `--watermark-opacity <float>` (0-1).

```bash
npm install
# Full run: convert + overlay + diagonal using watermark and dims options
npm run convert -- full "C:\\path\\to\\input" --watermark "C:\\path\\to\\Maker Hardware BW trans USE FOR IMAGE WATERMARK.png" --watermark-opacity 0.3 --dims-keyword -dims

# Convert only (no watermarking)
npm run convert -- convert "C:\\path\\to\\input"

# Overlay only (center watermark on files NOT ending in 01)
npm run convert -- overlay "C:\\path\\to\\input" --watermark "C:\\path\\to\\Maker Hardware BW trans USE FOR IMAGE WATERMARK.png" --watermark-opacity 0.3

# Diagonal overlay only (applies only to files matching dims keyword)
npm run convert -- diagonal "C:\\path\\to\\input" --watermark "C:\\path\\to\\Maker Hardware BW trans USE FOR IMAGE WATERMARK.png" --dims-keyword -dims
```

Notes:

- Paths with spaces must be quoted.
- Output is written to a `webp/` folder next to the input folder (sibling directory under the same parent).

## Development

1. Install Node.js (LTS, v18+ recommended)
2. Install dependencies: `npm install`
3. Run tests: `npm test`
4. If you want to run the Electron app for manual testing: `npm run dev` (this is primarily for development/debugging)
5. Build a Windows installer: `npm run build` (builds into `dist/v<package-version>/` using the version in `package.json`, e.g., `dist/v1.1.0/`). To bump and build in one command use `npm run build:version -- 1.2.0`. You can still run `electron-builder` directly if you prefer a different output location. You may need Administrator privileges or Developer Mode enabled on Windows.

## Why Electron + sharp

- `sharp` provides high-performance image resizing and WebP support with prebuilt native binaries, avoiding local build issues.
- Electron provides a straightforward way to ship a GUI and create a Windows installer for non-technical users.

## Links & References

- Electron packaging docs: <https://www.electronjs.org/docs/latest/tutorial/tutorial-packaging>
- sharp docs: <https://sharp.pixelplumbing.com/>
- electron-builder: <https://www.electron.build/>

## TODO

See `.github/TODOs.md` for project roadmap
