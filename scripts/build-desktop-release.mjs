#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const target = args.has("--mac") ? "mac" : "win";
const configPath = path.join(root, "electron-builder.json");
const tempDir = path.join(root, "dist");
const tempConfigPath = path.join(tempDir, "electron-builder.release.json");
const repositorySlug = (process.env.GITHUB_REPOSITORY || "anthonybnajem/blood-system").trim();
const [owner, repo] = repositorySlug.split("/", 2);

if (!owner || !repo) {
  console.error("Missing valid GITHUB_REPOSITORY. Example: anthonybnajem/blood-system");
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
config.publish = [
  {
    provider: "github",
    owner,
    repo,
    releaseType: "release",
  },
];

fs.mkdirSync(tempDir, { recursive: true });
fs.writeFileSync(tempConfigPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

const bundleResult = spawnSync("npm", ["run", "desktop:bundle"], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (bundleResult.status !== 0) {
  process.exit(bundleResult.status ?? 1);
}

const builderArgs =
  target === "mac"
    ? ["electron-builder", "--mac", "dmg", "zip", "--arm64", "--config", tempConfigPath]
    : ["electron-builder", "--win", "nsis", "--x64", "--config", tempConfigPath];
const publishMode = process.env.GH_TOKEN ? "always" : "never";
builderArgs.push("--publish", publishMode);

if (target === "mac" && publishMode === "always") {
  const missing = [
    "CSC_LINK",
    "CSC_KEY_PASSWORD",
    "APPLE_ID",
    "APPLE_APP_SPECIFIC_PASSWORD",
    "APPLE_TEAM_ID",
  ].filter((name) => !String(process.env[name] || "").trim());

  if (missing.length > 0) {
    console.error(
      `Missing required mac release signing/notarization environment variables: ${missing.join(", ")}`
    );
    process.exit(1);
  }
}

const builderResult = spawnSync("npx", builderArgs, {
  cwd: root,
  env: process.env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(builderResult.status ?? 1);
