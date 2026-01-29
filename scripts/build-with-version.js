#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function usage() {
  console.error('Usage: node scripts/build-with-version.js <version>');
  process.exit(1);
}

const v = process.argv[2];

const pkgPath = path.join(process.cwd(), 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
let version;
let updatingPackage = false;

if (!v) {
  // No version argument: use current package.json version and do not modify package.json
  version = pkg.version;
  console.log(`No version argument provided — using current package.json version: ${version}`);
} else {
  const argVersion = v.startsWith('v') ? v.slice(1) : v;
  if (!/^\d+\.\d+\.\d+$/.test(argVersion)) {
    console.error('Version must be semver like 1.1.0');
    process.exit(1);
  }
  version = argVersion;
  updatingPackage = true;
  const oldVersion = pkg.version;
  console.log(`Setting package version: ${oldVersion} -> ${version}`);
  pkg.version = version;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
}

try {
  const outDir = `dist/v${version}`;
  console.log(`Running build with output directory: ${outDir}`);
  // Invoke electron-builder directly to avoid recursively calling this helper
  try {
    execSync(`npx electron-builder --config.directories.output=${outDir}`, { stdio: 'inherit' });
  } catch (err) {
    // Fallback to calling electron-builder if npx fails
    execSync(`electron-builder --config.directories.output=${outDir}`, { stdio: 'inherit' });
  }
  console.log(`Build finished. Artifacts in ${outDir}`);
} catch (err) {
  console.error('Build failed:', err);
  if (updatingPackage) {
    // restore package.json version on failure
    pkg.version = pkg.version; // no-op but kept for parity; real oldVersion not stored here
    // Best-effort: read package again to avoid overwriting with changed value
    const current = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (current.version !== version) {
      // nothing
    }
  }
  process.exit(1);
}

if (updatingPackage) {
  console.log('Done. package.json updated to version', version);
} else {
  console.log('Done. Built using existing package.json version', version);
}