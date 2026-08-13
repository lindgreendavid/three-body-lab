import { spawnSync } from "node:child_process";

const patchedAdvisories = new Set([
  "GHSA-w3rx-r6r6-pgpr",
  "GHSA-5p2g-fcmc-qvqq",
]);

const probe = String.raw`
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const vinextEntry = fileURLToPath(import.meta.resolve("vinext"));
const imageSizeEntry = resolve(
  dirname(vinextEntry),
  "../../image-size/dist/index.mjs",
);
const { imageSize } = await import(pathToFileURL(imageSizeEntry));

function expectMalformed(buffer, label) {
  let rejected = false;
  try {
    imageSize(buffer);
  } catch {
    rejected = true;
  }
  if (!rejected) throw new Error(label + " payload was accepted");
}

const icns = Buffer.alloc(16);
icns.write("icns", 0, "ascii");
icns.writeUInt32BE(16, 4);
icns.write("ic07", 8, "ascii");
icns.writeUInt32BE(0, 12);
expectMalformed(icns, "ICNS");

const jxl = Buffer.alloc(40);
jxl.writeUInt32BE(12, 0);
jxl.write("JXL ", 4, "ascii");
jxl.set([0x0d, 0x0a, 0x87, 0x0a], 8);
jxl.writeUInt32BE(20, 12);
jxl.write("ftyp", 16, "ascii");
jxl.write("jxl ", 20, "ascii");
jxl.writeUInt32BE(0, 32);
jxl.write("jxlp", 36, "ascii");
expectMalformed(jxl, "JXL");

const heif = Buffer.alloc(52);
heif.writeUInt32BE(16, 0);
heif.write("ftyp", 4, "ascii");
heif.write("avif", 8, "ascii");
heif.writeUInt32BE(36, 16);
heif.write("meta", 20, "ascii");
heif.writeUInt32BE(24, 28);
heif.write("iprp", 32, "ascii");
heif.writeUInt32BE(16, 36);
heif.write("ipco", 40, "ascii");
heif.writeUInt32BE(0, 44);
heif.write("ispe", 48, "ascii");
expectMalformed(heif, "HEIF");
`;

const regression = spawnSync(
  process.execPath,
  ["--input-type=module", "--eval", probe],
  { encoding: "utf8", timeout: 2_000 },
);

if (regression.error || regression.status !== 0) {
  const detail =
    regression.error?.message ||
    regression.stderr.trim() ||
    `probe exited with status ${regression.status}`;
  console.error(`Patched image parser regression failed: ${detail}`);
  process.exit(1);
}

const audit = spawnSync(
  "pnpm",
  ["audit", "--prod", "--audit-level", "high", "--json"],
  { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
);

let report;
try {
  report = JSON.parse(audit.stdout);
} catch {
  console.error(audit.stderr || audit.stdout || "pnpm audit returned no JSON");
  process.exit(1);
}

const advisories = Object.values(report.advisories ?? {});
const unexpected = advisories.filter(
  (advisory) => !patchedAdvisories.has(advisory.github_advisory_id),
);

if (unexpected.length > 0) {
  for (const advisory of unexpected) {
    console.error(
      `${advisory.severity}: ${advisory.github_advisory_id} ${advisory.title}`,
    );
  }
  process.exit(1);
}

const seen = new Set(
  advisories.map((advisory) => advisory.github_advisory_id),
);
for (const advisory of patchedAdvisories) {
  if (!seen.has(advisory)) {
    console.log(`${advisory}: no longer reported by the registry`);
  }
}

if (advisories.length > 0) {
  console.log(
    "The only reported high-severity advisories are covered by the committed parser patch and malformed-input regression probes.",
  );
} else {
  console.log("No high-severity production vulnerabilities found.");
}
