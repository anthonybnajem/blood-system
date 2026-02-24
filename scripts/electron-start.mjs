#!/usr/bin/env node

import { spawn } from "node:child_process";

const port = process.env.PORT || "3000";
const startUrl = `http://localhost:${port}`;
const maxAttempts = 120;
const pollIntervalMs = 500;
const env = { ...process.env, ELECTRON_START_URL: startUrl };

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

const nextStart = spawnProcess("npm", ["run", "start"], { env });
nextStart.on("exit", (code) => {
  if (!shuttingDown) {
    shutdown(code ?? 1);
  }
});

try {
  await waitForServer(startUrl);
  const electron = spawnProcess("npx", ["electron", "."], { env });
  electron.on("exit", (code) => shutdown(code ?? 0));
} catch (error) {
  console.error(`[electron:start] ${error.message}`);
  shutdown(1);
}
