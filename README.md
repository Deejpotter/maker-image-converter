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
This project is intended to be used from the terminal. The CLI is the recommended and supported workflow for batch conversions.

- Convert a folder using Node (recommended):

  ```bash
  npm install
  npm run convert -- "<input-folder>"
  ```

- Convert using Python fallback (Pillow):

  ```bash
  python converter.py "<input-folder>"
  ```

Notes:
- Paths with spaces must be quoted.
- Output is written to a `webp/` folder next to the input folder (sibling directory under the same parent).

## Development
1. Install Node.js (LTS, v18+ recommended)
2. Install dependencies: `npm install`
3. Run tests: `npm test`
4. If you want to run the Electron app for manual testing: `npm run dev` (this is primarily for development/debugging)
5. Build a Windows installer: `npm run build` (configured to call `electron-builder`; you may need Administrator privileges or Developer Mode enabled on Windows)

## Why Electron + sharp
- `sharp` provides high-performance image resizing and WebP support with prebuilt native binaries, avoiding local build issues.
- Electron provides a straightforward way to ship a GUI and create a Windows installer for non-technical users.

## Links & References
- Electron packaging docs: https://www.electronjs.org/docs/latest/tutorial/tutorial-packaging
- sharp docs: https://sharp.pixelplumbing.com/
- electron-builder: https://www.electron.build/

## TODO
See `.github/TODOs.md` for project roadmap