# Project Todos & Plan

This file records the plan, the logic behind each step, and sub-steps. It is the canonical source for the current tasks and their implementation status.

## Overview

We observed the UI can become unresponsive when converting many images. The immediate mitigation is to provide a reliable CLI for terminal-based conversion and document the CLI as the recommended workflow. Longer-term, move processing out of the main Electron process (worker threads/child processes) and add CI, packaging, and signing automation.

---

## Tasks

1) Add terminal-first CLI (STATUS: done)

- Logic: A CLI lets power users avoid the UI and run conversions from a terminal or scripts. It also provides a straightforward, automatable workflow.
- Sub-steps:
  - Create `bin/convert.js` that accepts a folder path and calls `processFolder`.
  - Add `npm run convert` script for convenience.
  - Add test `tests/cli.test.js` to validate the CLI works on a temp folder.
  - Update docs to present CLI usage as the recommended workflow.

1) Update documentation to reflect the new CLI-first workflow (STATUS: done)

- Logic: Docs should show the new default workflow and include usage examples with quoted paths for Windows.
- Sub-steps:
  - Update `README.md` to point to the new `USAGE.md` for step-by-step usage.
  - Create `USAGE.md` containing Node and Python usage examples and troubleshooting tips.
  - Record all steps here in `.agents/todos.md`.

1) Add CLI tests (STATUS: done)

- Logic: Tests ensure the CLI works and cover regressions.
- Sub-steps:
  - Add `tests/cli.test.js` which creates a temp image and verifies `webp/test.webp` is produced in the parent-level `webp` folder.
  - Run `npm test` and ensure all tests pass.

3.1) Make `webp` a sibling of the input folder (STATUS: done)

- Logic: Users expect output as a sibling `webp` directory (e.g., `Dimensions/webp`) rather than a subfolder under the input folder.
- Sub-steps:
  - Update `src/imageProcessor.js` to write to `path.dirname(folderPath)/webp`.
  - Update `converter.py` to write to `input_dir.parent / "webp"`.
  - Update tests (`tests/imageProcessor.test.js`, `tests/cli.test.js`) to check the sibling `webp` location.
  - Update `USAGE.md` and `README.md` to clearly document the output location.
  - Run tests and manual verify using the sample folder.

1) Improve UI responsiveness (STATUS: done)

- Logic: Long-running CPU or I/O tasks in the Electron main thread can cause the UI to be unresponsive on some systems. Offloading to a child process avoids contention and keeps the UI responsive while processing large folders.
- Sub-steps:
  - Research options: `worker_threads`, `child_process.fork`, or spawning the existing CLI (`bin/convert.js`) as a child process and piping progress back via `ipcMain`.
  - Implement a prototype using `child_process.fork` with `src/worker.js` which runs `processFolder` and sends `progress` and `done` messages via `process.send`.
  - Update `src/ipcHandlers.js` to use a forked worker and forward worker messages to the renderer. Accept an injected `fork` function for easier testing.
  - Add unit tests that mock `fork` and verify progress, done, and cancel behavior (`tests/ipcHandlers.test.js`).
  - Manual verification: run conversion via GUI and confirm UI remains responsive; verify CLI still works.
  - Next: consider swapping to `worker_threads` if sharing memory or higher-performance IPC is needed.

1) Pin & verify Electron version (STATUS: done)

- Logic: Locking the Electron version to a known-good release (used successfully in local builds) prevents unexpected breaking changes from caret ranges. This ensures reproducible builds and CI consistency.
- Sub-steps:
  - Update `package.json` to pin `electron` to a tested version (e.g., `26.6.10`).
  - Run `npm install` and `npm test` to ensure no regressions.
  - If build tools need updates (e.g., `electron-builder` config), adjust and run a local build to validate.

1) Add tests for every section (STATUS: done)

- Logic: Increase coverage for core areas: CLI, image processing, IPC handlers (main), preload (API exposure), renderer (UI), and packaging steps where practical. Tests reduce regressions and give confidence when refactoring or changing dependencies.
- Sub-steps:
  - Add tests for `preload.js` that assert it exposes the expected API and calls `ipcRenderer` methods correctly (mock `contextBridge` and `ipcRenderer`).
  - Move IPC registration into `src/ipcHandlers.js` and add tests that verify handlers are registered and behave with mocked `ipcMain`, `dialog`, and `imageProcessor`.
  - Fix small bugs in `src/renderer/renderer.js` (missing element references) and add `tests/renderer.test.js` using `jsdom` to verify UI updates on progress/done/cancel events.
  - Ensure `tests/cli.test.js` already exists and is robust; add more CLI edge-case tests (no-folder, unsupported files).
  - Run `npm test` and aim for green tests across the suite.

1) Publish & Release automation (STATUS: not started)

- Logic: Automate builds and release artifacts using `electron-builder` and GitHub releases on tag to make releases reproducible and auditable.
- Sub-steps:
  - Add `build.publish` settings or rely on `--publish` flags with `GH_TOKEN` in CI.
  - Create GitHub Actions workflow (tests → build → publish on tag).
  - Add checks for code signing environment variables.

1) Watermarking features (STATUS: done)

- Logic: Support adding a watermark to all non-primary images, and a diagonal watermark option for "dimensions" images. Defaults are backwards compatible; implementation includes tests and CLI support.
- Sub-steps:
  - API: Add `options` parameter to `processFolder(folderPath, progressCb, options)`.
    - `options.watermarkPath` (string): path to watermark PNG. ✅
    - `options.watermarkOpacity` (number, default 0.2). ✅
    - `options.dimsKeyword` (string, default `-dims`). ✅
    - `options.dimsFolder` (string, optional) to mark a folder as containing dimension images. ✅
  - Implementation:
    - Add helper to decide watermark type for each file: none / center / diagonal. ✅
    - Update `convertImage` to composite watermark with `sharp` using `opacity` and `gravity: 'centre'`. ✅
    - For diagonal watermark: scale pre-rotated asset to fit within bounds; composite centered. ✅
    - Preserve existing behavior when `options` omitted. ✅
  - Tests: ✅
    - Added tests to `tests/imageProcessor.test.js` verifying:
      - Files ending with `01` do not get watermarked (unless dims).

1) UI/UX Polish (STATUS: done)

- Logic: Improve the user-facing documentation in the app and ensure the window starts in a state that provides maximum visibility.
- Sub-steps:
  - Enhance `src/renderer/index.html` with a detailed "What this app does" and "How to use" section. ✅
  - Add descriptions for each mode (Full, Convert, Overlay, Diagonal). ✅
  - Configure `src/main.js` to start the window maximized. ✅

1) Fix Build & Packaging Issues (STATUS: not started)

- Logic: The user encountered `MODULE_NOT_FOUND` for `has-flag` and `makensis.exe ENOENT` during `yarn build`. This indicates dependency corruption and missing system requirements for Electron Builder.
- Sub-steps:
  - Clear `node_modules` and the Yarn/NPM cache to resolve dependency fragmentation (`has-flag` issue).
  - Verify NSIS installation or configure Electron Builder to download/use a portable NSIS.
  - Run `npm install` (or `yarn`) as admin to ensure restricted file permissions are handled.
  - Test the build with `npm run build` or `yarn build`.
      - Other files get center watermark (checked via pixel sampling).
      - Files containing `-dims` get diagonal watermark when enabled.
  - CLI: ✅
    - `bin/convert.js` now accepts `--watermark`, `--dims-keyword`, `--watermark-opacity`, and `--dims-folder` flags and passes options to `processFolder`.
  - Docs: ✅
    - `USAGE.md` updated with a usage example demonstrating watermark flags.

9) GUI Stability Improvements (STATUS: completed)

- Logic: The GUI (Electron app) occasionally throws errors during processing even though the underlying Node CLI works reliably. This is an IPC/worker communication issue. To make the GUI more stable:
  1. Add error handling and logging in the worker to capture full error context.
  2. Improve error messages in the renderer so users see meaningful feedback.
  3. Add timeout protection to prevent hanging processes.
  4. Recommend CLI for production use in the GUI (per README).
  
- Sub-steps:
  - Add structured error logging to `src/worker.js` so errors are captured with full stack traces. ✅ COMPLETED
    - Added console.error logging at startup, on completion, and all error paths
    - Included full error.stack in failure messages sent to renderer
    - Added process.on('uncaughtException') handler for unexpected errors
  - Update `src/ipcHandlers.js` to provide more context in error messages. ✅ COMPLETED
    - Added cleanup helper to properly terminate workers and clear timeouts
    - Set 5-minute timeout on worker process to prevent indefinite hangs
    - Added error.kill('SIGTERM') when timeout expires
    - Improved error messages to include worker exit codes and communication failures
    - Added worker exit handler to detect unexpected exits
  - Add timeout handling to the worker process to prevent indefinite hangs. ✅ COMPLETED
    - Implemented WORKER_TIMEOUT = 5 minutes in ipcHandlers.js
    - Sets setTimeout to kill worker and notify renderer if timeout exceeded
    - Clears timeout when worker completes normally (type: 'done' message)
  - Update renderer to display full error messages and provide CLI fallback suggestion. ✅ COMPLETED
    - Enhanced onDone handler to display full error message in red monospace font
    - Added escapeHtml() helper to safely display errors without HTML injection
    - Added "Tip" suggestion to use CLI for large folders when errors occur
    - CLI example shown: `npm run convert -- full "path/to/folder"`
  - Add robust error recovery in preload/main so disconnected workers are cleaned up. ✅ COMPLETED
    - Updated ipcHandlers.js cleanupWorker() to safely kill worker and clear timeout
    - Worker kill wrapped in try-catch to handle already-dead processes
    - All handlers (process-folder, cancel-process, error) call cleanup on exit
  - Update README.md and USAGE.md to emphasize CLI as primary workflow and GUI as secondary. ✅ COMPLETED
    - Updated README.md header to emphasize CLI as "primary and recommended workflow"
    - Added "If the GUI shows errors" section with CLI fallback example
    - Changed default opacity mention from 0.3 to 0.2
    - Clarified that CLI is "more stable" than GUI

Result: GUI now displays meaningful errors, suggests CLI when needed, and has timeout protection. All tests pass.


Goal: Provide CLI and programmatic interface with 4 distinct actions and a "Full Run" that executes them all in one run.

Sections

A) Convert only ("convert")

- Logic: Convert all supported images in a folder to 800x800 WebP (no watermarking). This is included in Full Run and also offered as a standalone action.
- Sub-steps:
  - Add `convertOnly(folder, progressCb, options)` that calls `processFolder` with watermarking disabled. ✅
  - Add CLI command `convert <folder>` mapping to `convertOnly`. ✅
  - Add tests for `convertOnly` and `convert` CLI. ✅

B) Overlay only ("overlay")

- Logic: Apply center watermark (default 30% opacity) to all images except those ending with `01`. Produce 800x800 WebP outputs. Run standalone per-folder.
- Sub-steps:
  - Implement `overlayOnly(folder, progressCb, options)` that applies center watermark to non-`01` files and converts. ✅
  - Add CLI `overlay <folder> --watermark <path> [--watermark-opacity]`. ✅
  - Add tests validating only non-`01` files get watermarked. ✅

C) Diagonal overlay only ("diagonal")

- Logic: Apply diagonal watermark (default 30% opacity) to "dims" images only (identified by `-dims` keyword or when the folder is explicitly marked). Produce 800x800 WebP outputs.
- Sub-steps:
  - Implement `diagonalOnly(folder, progressCb, options)` that applies diagonal watermark to files matching `dimsKeyword` or when `dimsFolder` matches. ✅
  - Add CLI `diagonal <folder> --watermark <path> [--dims-keyword|-dims]`. ✅
  - Add tests to verify diagonal watermarking only affects dims images. ✅

D) Full Run ("full")

- Logic: Run Convert + Overlay + Diagonal logic in a single pass, making per-file decisions whether to skip watermark, apply center, or apply diagonal watermark.
- Sub-steps:
  - Provide `fullRun(folder, progressCb, options)` which delegates to `processFolder(folder, progressCb, options)`. ✅
  - Add CLI `full <folder> [--watermark ...]` which runs `fullRun`. ✅
  - Add integration tests verifying mixed outputs. ✅

General tasks:

- Update `USAGE.md` and `README.md` with command examples and behavior descriptions. ✅
- Add CLI unit tests and integration tests to CI. ✅

---

All planned steps for the 4-section interface are implemented and covered by automated tests. ✅

Added built-in watermark asset and default handling:

- `assets/Maker Hardware BW trans USE FOR IMAGE WATERMARK.svg` added and bundled with the app. ✅
- Watermark is now optional for `overlay`, `diagonal`, and `full` workflows; the app will use the built-in watermark if none is provided via CLI or UI. ✅

API/UI/Worker changes:

- `src/preload.js` exposes `processFolder({ folder, command, options })` for the renderer. ✅
- `src/ipcHandlers.js` accepts object payloads and forwards `command` and `options` to the worker. ✅
- `src/worker.js` now delegates to `convertOnly`, `overlayOnly`, `diagonalOnly`, or `processFolder` based on the `command` provided. ✅
- UI (`src/renderer/index.html`, `src/renderer/renderer.js`) now includes a mode selector and inputs for watermark path/opacity and dims keyword. ✅

Tests updated:

- CLI and unit tests were updated to rely on built-in watermark by default (no need to provide an external watermark path). ✅

If you want, I can now:

1) Open a PR with these changes, or
2) Add CI workflow updates to run the build and the new tests, or
3) Add a small E2E test for the renderer + worker integration.

Release notes:

- Bumped package version to **v1.0.0** — initial stable release.
- NSIS installer artifact configured to include `Installer` in its filename: `${productName} Installer ${version}.${ext}`.
- Build artifacts will be produced in `dist/` as usual; the NSIS installer will include `Installer` in the file name.
