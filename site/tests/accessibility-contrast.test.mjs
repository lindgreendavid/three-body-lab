import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(name) {
  return readFile(new URL(name, root), "utf8");
}

function luminance(hex) {
  const channels = hex.match(/[0-9a-f]{2}/gi).map((value) => Number.parseInt(value, 16) / 255);
  const linear = channels.map((value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(first, second) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test("keeps normal-text palette combinations above WCAG AA contrast", async () => {
  const styles = await source("app/globals.css");
  const colors = Object.fromEntries(
    [...styles.matchAll(/--([a-z]+): (#[0-9a-f]{6})/gi)].map((match) => [match[1], match[2]]),
  );
  for (const [foreground, background] of [
    ["ink", "paper"],
    ["muted", "paper"],
    ["muted", "white"],
    ["ink", "coral"],
    ["blue", "paper"],
  ]) {
    assert.ok(
      contrast(colors[foreground], colors[background]) >= 4.5,
      `${foreground} on ${background} must meet 4.5:1`,
    );
  }
});
