# Improvement Plan

This plan outlines the steps to improve the application description in the UI and ensure the window starts maximized.

## 1. Maximize Window on Startup
### Logic
Ensure the Electron main window starts in a maximized state to provide the best user experience on launch. Although `win.maximize()` is present, we can refine the window creation to ensure it appears only when ready and fully maximized to prevent flickering.

### Sub-steps
- [ ] Modify `src/main.js` to create the window initially hidden (`show: false`).
- [ ] Call `win.maximize()` before showing.
- [ ] Use `win.once('ready-to-show', ...)` to show the window.

## 2. Improve App Description in `index.html`
### Logic
The current description is a bit brief. We will expand it to include specific details about the processing pipeline (800x800, white background, WebP 80% quality) and clarify the filename logic for watermarking.

### Sub-steps
- [ ] Expand "What this app does" to mention the 80% quality WebP conversion and output folder structure.
- [ ] Detail the resizing logic: "aspect-ratio preserving fit on an 800x800 white canvas".
- [ ] Clarify the "Application Modes" descriptions to be more explicit about what happens in each.
- [ ] Mention the `-dims` keyword and how folder naming affects diagonal watermarks.

## 3. Implementation
- [ ] Apply changes to `src/main.js`.
- [ ] Apply changes to `src/renderer/index.html`.
