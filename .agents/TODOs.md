# TODOs

- [ ] Todo: Add unit tests for conversion logic
- [x] In Progress: Implement image conversion to WebP with white background
- [x] Completed: Create initial project structure and README
- [ ] In Progress: Implement desktop app using Electron + sharp
  - Status: Research completed. Recommendation: Use Electron + sharp for image processing and packaging with `electron-builder`.
  - Next steps:
    1. Scaffold Electron project and integrate `sharp` for image operations (resize to 800x800, white background).
    2. Implement folder-selection UI and batch processing with progress and error handling.
    3. Add unit and integration tests for core conversion logic.
    4. Add packaging scripts using `electron-builder` to produce a Windows installer (.exe).
    5. Add GitHub Actions to build and release Windows artifacts.
- [ ] Todo: Add an easy GUI for non-technical users (Electron front-end)