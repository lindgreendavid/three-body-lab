import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the finished research laboratory", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Three Body Lab/);
  assert.match(html, /Two nearly identical starts/);
  assert.match(html, /Live simulator/);
  assert.match(html, /Frozen registry/);
  assert.match(html, /Scientific method/);
  assert.match(html, /Research trail/);
  assert.match(html, /Run the simulator/);
  assert.match(html, /Skip to main content/);
  assert.match(html, /Read the complete perturbation-magnitude sweep data/);
  assert.match(html, /Read the complete mass-ratio sweep data/);
  assert.match(html, /Routh/);
  assert.match(html, /figure-eight/i);
  assert.match(html, /Accessibility/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Starter Project/);
});

test("ships accessible controls and research boundaries", async () => {
  const [page, simulator, lyapunovMap, layout, styles, packageJson, heroOrbit] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/simulator.tsx", root), "utf8"),
    readFile(new URL("app/lyapunov-map.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
    readFile(new URL("app/hero-orbit.tsx", root), "utf8"),
  ]);
  assert.match(simulator, /aria-label="Simulator controls"/);
  assert.match(simulator, /htmlFor="perturbation"/);
  assert.match(simulator, /aria-describedby="export-status"/);
  assert.match(simulator, /role="status" aria-live="polite"/);
  assert.match(simulator, /prefers-reduced-motion: reduce/);
  assert.match(page, /className="skip-link"/);
  assert.match(page, /<HeroOrbit \/>/);
  assert.match(heroOrbit, /aria-hidden="true"/);
  assert.match(heroOrbit, /prefers-reduced-motion: reduce/);
  assert.match(lyapunovMap, /<caption>Perturbation-magnitude sweep/);
  assert.match(lyapunovMap, /Scrollable perturbation sweep data table/);
  assert.match(lyapunovMap, /limitations-first/);
  assert.match(styles, /prefers-contrast: more/);
  assert.match(styles, /forced-colors: active/);
  assert.match(styles, /\.nav__links a \{ display: inline-flex; min-height: 44px/);
  assert.match(layout, /Three Body Lab/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton|drizzle/);
  try {
    assert.deepEqual(await readdir(new URL("app/_sites-preview", root)), []);
  } catch (error) {
    assert.equal(error.code, "ENOENT");
  }
});

test("ships the complete frozen Lyapunov registry into the interactive release", async () => {
  const registry = JSON.parse(
    await readFile(new URL("../reports/v0.1-lyapunov-registry.json", root), "utf8"),
  );
  assert.equal(registry.schema_version, 1);
  assert.equal(registry.perturbation_sweep.length, 36);
  assert.equal(registry.mass_ratio_sweep.length, 6);
  assert.ok(
    registry.perturbation_sweep.every((cell) => cell.exponents.length === 3),
    "every perturbation-sweep cell must report 3 seeded replications",
  );
  assert.ok(
    [...registry.perturbation_sweep, ...registry.mass_ratio_sweep].every((cell) =>
      ["stable", "borderline", "chaotic"].includes(cell.classification),
    ),
  );
});
