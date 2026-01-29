# Project State & Decisions

This file documents the current way we structure and run the project and lists key decisions and reasoning.

## Current recommended workflow

- Primary interface: **Command-line (Node) CLI** (`npm run convert`) — fast, scriptable, and the canonical workflow for all batch processing. The CLI exposes four commanded actions: `convert` (no watermark), `overlay` (center watermark for non-01 images), `diagonal` (diagonal watermark for dims images), and `full` (run all steps in one pass).

  - **Watermark defaults**: Built-in PNG used if no `--watermark` path is provided. The center overlay fills the 800×800 output width; the diagonal overlay spans corner-to-corner. Opacity is applied per `--watermark-opacity` (default 0.3).

## Architecture decisions

- Image processing: `sharp` (Node.js library) for efficient resizing and WebP conversion (prebuilt native binaries).
- Electron: pinned to **26.6.10** to provide reproducible builds and avoid breaking changes from caret ranges.
- UI responsiveness: processing is offloaded to a child process (`src/worker.js`) forked from `src/ipcHandlers.js` to keep the main process and renderer responsive during large jobs.
- Logging: processing logs are appended to `logs/app.log` in the repository working directory.

## Testing & Quality

- Unit tests cover core areas: `imageProcessor` (conversion, cancel behavior), CLI, `preload` API, IPC handlers, and renderer using `jsdom`.
- Run tests locally with `npm test`.

## Packaging & Releases

- Packaging uses `electron-builder` and has been validated locally (NSIS installer and portable targets built). Signing and automated publish require additional CI and credentials (code signing certificate, `GH_TOKEN`, `CSC_LINK`, `CSC_KEY_PASSWORD`).

## Next actions (short term)

- Add an E2E test or lightweight integration that verifies renderer → worker end-to-end.
- Add CI to run tests and build artifacts on a clean environment.
