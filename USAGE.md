# Usage & Quick Start

This project is designed to be used primarily from the terminal. Below are recommended ways to convert a folder of images to WebP.

## Using Node (recommended)

Install dependencies and run the bundled CLI:

```bash
npm install
npm run convert -- "G:\\My Drive\\Work Stuff\\Photos\\30 Series\\Dimensions\\raw"
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
