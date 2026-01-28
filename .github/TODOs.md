# TODOs

- [ ] Todo: Add unit tests for conversion logic
- [x] In Progress: Implement image conversion to WebP with white background
- [x] Completed: Create initial project structure and README

## Electron + sharp migration plan (high level)
- [x] Todo: Research and compare options (Electron vs Tauri vs Python-native)
- [x] In Progress: Decide on Electron + sharp as the primary approach

## Implementation steps (detailed)
- [x] Todo: Scaffold Electron project (package.json, main, preload, renderer files)
  - Sub-steps:
    - Create `package.json` with scripts and `electron-builder` config. ✅
    - Add `src/main.js` (main process), `src/preload.js`, `src/renderer/*` (UI files). ✅
- [x] Todo: Implement image processing with `sharp` (800x800, white background)
  - Sub-steps:
    - Create `src/imageProcessor.js` that processes a folder and converts images with progress callbacks. ✅
- [x] Todo: Implement minimal GUI for folder selection and progress display
  - Sub-steps:
    - Add UI: `index.html`, `renderer.js` to select folder and start processing. ✅
- [x] Todo: Add packaging and CI
  - Sub-steps:
    - Configure `electron-builder` in `package.json`. ✅
    - Add GitHub Actions workflow: `.github/workflows/build-windows.yml`. ✅
- [ ] Todo: Add unit tests for core logic (image processing)
  - Sub-steps:
    - Add tests (e.g., using jest or mocha) for `imageProcessor`.
    - Add test runner to CI.
- [ ] Todo: Add better UI/UX and error handling
  - Sub-steps:
    - Improve renderer UI with progress bar and ability to cancel.
    - Add logging and better error messages.
- [ ] Todo: Add release automation
  - Sub-steps:
    - GitHub Actions to create releases and upload Windows artifacts.
    - Add auto-update or instructions for users.

## Notes
- The original Python `converter.py` is retained in the repo for reference but the project now primarily uses Electron + `sharp` for distribution.
