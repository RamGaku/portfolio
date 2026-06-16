import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const processes = [
  spawnNode("web", "node_modules/vite/bin/vite.js", ["--host", "127.0.0.1", "--port", "5173"]),
  spawnNode("api", "node_modules/tsx/dist/cli.mjs", ["watch", "server/index.ts"])
];

let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  for (const child of processes) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => shutdown(signal));
}

for (const child of processes) {
  child.on("exit", (code) => {
    if (!shuttingDown && code && code !== 0) {
      shutdown("SIGTERM");
      process.exitCode = code;
    }
  });
}

function spawnNode(name, scriptPath, args) {
  const child = spawn(process.execPath, [path.join(rootDir, scriptPath), ...args], {
    cwd: rootDir,
    env: {
      ...process.env,
      FORCE_COLOR: "1"
    },
    stdio: "inherit",
    shell: false
  });

  child.on("error", (error) => {
    console.error(`[${name}] failed to start`, error);
  });

  return child;
}
