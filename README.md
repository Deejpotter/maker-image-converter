# Maker Image Converter

A simple desktop application to batch convert images to WebP format with white background padding and a friendly GUI for non-technical users.

## Features
- Convert any image folder to WebP (800x800px, white background)
- Single installer (.exe) for Windows users
- Preserves original folder structure under `webp/` output directory

## Tech stack
- **Frontend/Packaging:** Electron (cross-platform desktop app)
- **Image processing:** `sharp` (Node.js image library using libvips)
- **Packaging tool:** `electron-builder` (create Windows installer / portable apps)

## Usage
1. Install the application (Windows installer)
2. Launch the app and select an input folder
3. The converted WebP files will appear in a `webp` subfolder next to the input folder

## Development
1. Install Node.js (LTS, v18+ recommended)
2. Install dependencies: `npm install`
3. Run in development mode: `npm run dev`
4. Build a Windows installer: `npm run build` (configured to call `electron-builder`)

## Why Electron + sharp
- `sharp` provides high-performance image resizing and WebP support with prebuilt native binaries, avoiding local build issues.
- Electron provides a straightforward way to ship a GUI and create a Windows installer for non-technical users.

## Links & References
- Electron packaging docs: https://www.electronjs.org/docs/latest/tutorial/tutorial-packaging
- sharp docs: https://sharp.pixelplumbing.com/
- electron-builder: https://www.electron.build/

## TODO
See `.github/TODOs.md` for project roadmap