#!/usr/bin/env node
// Deploys the interactive site to Cloudflare Workers with its home page saved as a static file.
//
// Why: the home page is large. On the free Workers plan, rendering it on every visit can exceed the CPU limit, and visitors then get an
// empty 503 error (this happened in November 2026). A static file in the assets bundle is served by Cloudflare without running the Worker.
//
// What it does: build, start the production server locally, save "/" as dist/client/index.html, stop the server, then deploy with
// `wrangler deploy`. Do not use `vinext-cloudflare deploy` for this site: it builds again first and deletes the saved page.
//
// Usage (from site/):  node scripts/deploy-static.mjs            build, snapshot, deploy
//                      node scripts/deploy-static.mjs --no-deploy  build and snapshot only, to inspect dist/client/index.html
import { execFileSync, spawn } from "node:child_process";
import { existsSync, statSync, writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = process.env.SNAPSHOT_PORT ?? "3057";
const noDeploy = process.argv.includes("--no-deploy");
const env = { ...process.env, WRANGLER_LOG_PATH: ".wrangler/wrangler.log" };
const windows = process.platform === "win32";

const run = (args) => execFileSync("npx", args, { stdio: "inherit", env, shell: true });

function stop(child) {
  if (!child.pid) return;
  try {
    if (windows) execFileSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    else process.kill(-child.pid, "SIGTERM");
  } catch {
    // already gone
  }
}

console.log("1/4 Building the site");
run(["vinext", "build"]);

console.log(`2/4 Rendering the home page from the production server on port ${PORT}`);
const server = spawn("npx", ["vinext", "start", "--port", PORT], { stdio: "ignore", env, shell: true, detached: !windows });
let html = "";
try {
  for (let i = 0; i < 60; i++) {
    await sleep(1000);
    try {
      const res = await fetch(`http://localhost:${PORT}/`);
      if (res.ok) {
        html = await res.text();
        break;
      }
    } catch {
      // not up yet
    }
  }
} finally {
  stop(server);
}
if (html.length < 1000) {
  console.error("Could not render the home page; nothing was deployed.");
  process.exit(1);
}

console.log("3/4 Saving it as a static file");
writeFileSync("dist/client/index.html", html);
if (!existsSync("dist/client/index.html") || statSync("dist/client/index.html").size !== Buffer.byteLength(html)) {
  console.error("The static file was not written; nothing was deployed.");
  process.exit(1);
}
console.log(`    dist/client/index.html (${Math.round(html.length / 1024)} KB)`);

if (noDeploy) {
  console.log("4/4 Skipped (--no-deploy)");
} else {
  console.log("4/4 Deploying with wrangler");
  run(["wrangler", "deploy", "--config", "dist/server/wrangler.json"]);
}
