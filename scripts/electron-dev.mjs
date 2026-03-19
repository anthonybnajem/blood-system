#!/usr/bin/env node

import { spawn } from "node:child_process";

const port = process.env.PORT || "3000";
const startUrl = `http://localhost:${port}`;
const maxAttempts = 120;
const pollIntervalMs = 500;
const env = { ...process.env, ELECTRON_DEV: "1", ELECTRON_START_URL: startUrl };
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";

const childProcesses = [];
let shuttingDown = false;

function spawnProcess(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: false,
    ...options,
  });
  childProcesses.push(child);
  return child;
}

async function waitForServer(url) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Keep polling until the server is available.
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  throw new Error(`Timed out waiting for Next.js server at ${url}`);
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of childProcesses) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

try {
  const dbSetup = spawnProcess(npmCmd, ["run", "db:setup"], { env });
  await new Promise((resolve, reject) => {
    dbSetup.on("exit", (code) => {
      if (code === 0) resolve(undefined);
      else reject(new Error(`DB setup failed with exit code ${code ?? 1}`));
    });
  });

  const nextDev = spawnProcess(npmCmd, ["run", "dev"], { env });
  nextDev.on("exit", (code) => {
    if (!shuttingDown) {
      shutdown(code ?? 1);
    }
  });

  await waitForServer(startUrl);
  const electron = spawnProcess(npxCmd, ["electron", "."], { env });
  electron.on("exit", (code) => shutdown(code ?? 0));
} catch (error) {
  console.error(`[electron:dev] ${error.message}`);
  shutdown(1);
}
