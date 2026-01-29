# Usage & Quick Start

This project is designed to be used primarily from the terminal. Below are recommended ways to convert a folder of images to WebP.

## Using Node (recommended)

Install dependencies and run the bundled CLI. The tool provides four commands: `convert`, `overlay`, `diagonal`, and `full`.

```bash
npm install
# Full run (convert + overlays)
npm run convert -- full "C:\\path\\to\\input" --watermark-opacity 0.3 --dims-keyword -dims

# Note
If you leave `--watermark` blank, the application will use its built-in watermark image (PNG) so you do not need to provide one. The included watermark is scaled to fit the 800×800 output and rendered at the configured opacity (default 0.3).
# Convert only (no watermarking)
npm run convert -- convert "C:\\path\\to\\input"

# Overlay only (center watermark on files NOT ending in 01)
npm run convert -- overlay "C:\\path\\to\\input" --watermark "C:\\path\\to\\Maker Hardware BW trans USE FOR IMAGE WATERMARK.png" --watermark-opacity 0.3

# Diagonal overlay only (applies only to files matching dims keyword)
npm run convert -- diagonal "C:\\path\\to\\input" --watermark "C:\\path\\to\\Maker Hardware BW trans USE FOR IMAGE WATERMARK.png" --dims-keyword -dims
```

The conversion writes converted images to a `webp/` folder next to the input folder (sibling directory under the same parent) and reports progress to the console.

> Note: paths containing spaces must be quoted on the command line.

## Using Python (fallback)

A simple Python script `converter.py` is available as a fallback (uses Pillow):

```bash
python converter.py "G:\\My Drive\\Work Stuff\\Photos\\30 Series\\Dimensions\\raw"
```

## Logs

Processing logs are appended to `logs/app.log` in the project working directory.

## Troubleshooting

- If you run into permission errors when building installers, open an elevated (Administrator) terminal or enable Developer Mode on Windows.
- If the GUI becomes unresponsive when converting large folders, use the CLI which runs in the Node process and avoids UI-related blocking.
