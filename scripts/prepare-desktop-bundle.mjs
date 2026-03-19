#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const standaloneDir = path.join(root, ".next", "standalone");
const staticDir = path.join(root, ".next", "static");
const outDir = path.join(root, "dist", "desktop");
const bundledAppDir = path.join(outDir, "app");

function ensureExists(targetPath, label) {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Missing ${label}: ${targetPath}`);
  }
}

function copyDir(source, destination) {
  fs.cpSync(source, destination, { recursive: true });
}

ensureExists(standaloneDir, "Next standalone output");
ensureExists(staticDir, "Next static output");
ensureExists(path.join(root, "electron", "main.cjs"), "Electron main file");
ensureExists(path.join(root, "electron", "preload.cjs"), "Electron preload file");
ensureExists(path.join(root, "scripts", "setup-sqlite.mjs"), "DB setup script");
ensureExists(path.join(root, "sql", "sqlite-schema.sql"), "SQLite schema");

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

copyDir(path.join(root, "electron"), path.join(outDir, "electron"));
copyDir(standaloneDir, bundledAppDir);
copyDir(staticDir, path.join(bundledAppDir, ".next", "static"));
copyDir(path.join(root, "sql"), path.join(bundledAppDir, "sql"));

// Next standalone can trace broad dynamic fs paths and pull project-level dist/.
// Remove it to avoid recursive electron-builder packaging.
fs.rmSync(path.join(bundledAppDir, "dist"), { recursive: true, force: true });

const publicDir = path.join(root, "public");
if (fs.existsSync(publicDir)) {
  copyDir(publicDir, path.join(bundledAppDir, "public"));
}

const bundledScriptsDir = path.join(bundledAppDir, "scripts");
fs.mkdirSync(bundledScriptsDir, { recursive: true });
fs.copyFileSync(
  path.join(root, "scripts", "setup-sqlite.mjs"),
  path.join(bundledScriptsDir, "setup-sqlite.mjs")
);

const rootPkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const bundledPkg = {
  name: rootPkg.name || "desktop-app",
  version: rootPkg.version || "1.0.0",
  main: "electron/main.cjs",
  private: true,
};

fs.writeFileSync(
  path.join(outDir, "package.json"),
  `${JSON.stringify(bundledPkg, null, 2)}\n`,
  "utf8"
);

console.log(`Desktop bundle prepared at ${outDir}`);
