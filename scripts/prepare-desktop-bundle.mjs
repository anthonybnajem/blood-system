#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const standaloneDir = path.join(root, ".next", "standalone");
const staticDir = path.join(root, ".next", "static");
const outDir = path.join(root, "dist", "desktop");
const bundledAppDir = outDir;

function ensureExists(targetPath, label) {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Missing ${label}: ${targetPath}`);
  }
}

function copyDir(source, destination) {
  fs.cpSync(source, destination, { recursive: true });
}

function copyRuntimePackageTree(packageName, destinationNodeModulesDir, seen = new Set()) {
  if (seen.has(packageName)) {
    return;
  }
  seen.add(packageName);

  const sourcePackageDir = path.join(root, "node_modules", packageName);
  const sourcePackageJsonPath = path.join(sourcePackageDir, "package.json");
  if (!fs.existsSync(sourcePackageJsonPath)) {
    throw new Error(`Missing runtime package for desktop bundle: ${packageName}`);
  }

  const destinationPackageDir = path.join(destinationNodeModulesDir, packageName);
  fs.mkdirSync(path.dirname(destinationPackageDir), { recursive: true });
  copyDir(sourcePackageDir, destinationPackageDir);

  const packageJson = JSON.parse(fs.readFileSync(sourcePackageJsonPath, "utf8"));
  for (const dependencyName of Object.keys(packageJson.dependencies || {})) {
    copyRuntimePackageTree(dependencyName, destinationNodeModulesDir, seen);
  }
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
copyDir(staticDir, path.join(outDir, ".next", "static"));
copyDir(path.join(root, "sql"), path.join(outDir, "sql"));

// Next standalone can trace broad dynamic fs paths and pull project-level dist/.
// Remove it to avoid recursive electron-builder packaging.
fs.rmSync(path.join(outDir, "dist"), { recursive: true, force: true });

const publicDir = path.join(root, "public");
if (fs.existsSync(publicDir)) {
  copyDir(publicDir, path.join(outDir, "public"));
}

const bundledScriptsDir = path.join(outDir, "scripts");
fs.mkdirSync(bundledScriptsDir, { recursive: true });
fs.copyFileSync(
  path.join(root, "scripts", "setup-sqlite.mjs"),
  path.join(bundledScriptsDir, "setup-sqlite.mjs")
);

const bundledNodeModulesDir = path.join(outDir, "node_modules");
fs.mkdirSync(bundledNodeModulesDir, { recursive: true });
copyRuntimePackageTree("electron-updater", bundledNodeModulesDir);

const rootPkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const bundledPkg = {
  name: rootPkg.name || "desktop-app",
  version: rootPkg.version || "1.0.0",
  description: rootPkg.description || "Desktop application",
  author: rootPkg.author || "",
  main: "electron/main.cjs",
  private: true,
  dependencies: {
    ...(rootPkg.dependencies || {}),
  },
};

fs.writeFileSync(
  path.join(outDir, "package.json"),
  `${JSON.stringify(bundledPkg, null, 2)}\n`,
  "utf8"
);

console.log(`Desktop bundle prepared at ${outDir}`);
