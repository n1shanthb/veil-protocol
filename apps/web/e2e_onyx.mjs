import { chromium, firefox } from "playwright";
import { spawn } from "child_process";
import assert from "assert";
import path from "path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const URL = "http://127.0.0.1:4173";

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function runChromiumOnyx() {
  console.log("\n=== Chromium: Real Browser-to-Onyx E2E ===");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForFunction(
    () => document.body.textContent.includes("14adde57e4863effcdf17af37edb304fee846e4e9d8da8ebed9844be2f8cdcee"),
    { timeout: 20000 }
  );
  console.log("  [chromium] Synced live Onyx Poll #1 & verified reconstructed root");

  await page.click("#btn-toggle-mode");
  await page.fill("#id-secret", "onyx-voter-3");
  await page.click("#btn-restore-id");
  await page.selectOption("#poll-select", "1");
  await page.selectOption("#opt-select", "0");

  const t0 = Date.now();
  await page.click("#btn-gen-proof");
  await page.waitForFunction(
    () => document.querySelector(".status-box")?.textContent?.includes("Ready to submit"),
    { timeout: 60000 }
  );
  console.log(`  [chromium] Genuine Semaphore v4 proof generated in ${Date.now() - t0}ms`);

  await page.click("#btn-submit-relayer");
  await page.waitForFunction(
    () => document.querySelector(".status-box")?.textContent?.includes("Relayer (200)"),
    { timeout: 45000 }
  );
  const relayerText = await page.textContent(".status-box");
  console.log(`  [chromium] Relayer response: ${relayerText}`);
  assert(relayerText.includes('"relayed":true'), `Expected relayed:true in ${relayerText}`);

  await page.waitForFunction(
    () => document.body.textContent.includes("Yes=2, No=1"),
    { timeout: 20000 }
  );
  console.log("  [chromium] Confirmed updated on-chain tally: Yes=2, No=1");
  assert.equal(errors.length, 0, `Page errors: ${errors.join("; ")}`);
  await browser.close();
}

async function runFirefoxOnyx() {
  console.log("\n=== Firefox: Live Onyx State & Registry Verification ===");
  const browser = await firefox.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForFunction(
    () =>
      document.body.textContent.includes("14adde57e4863effcdf17af37edb304fee846e4e9d8da8ebed9844be2f8cdcee") &&
      document.body.textContent.includes("Yes=2, No=1"),
    { timeout: 20000 }
  );
  console.log("  [firefox] Confirmed live Onyx Poll #1 tally (Yes=2, No=1) & reconstructed root");

  await page.click('button[data-tab="deployments"]');
  await page.waitForFunction(
    () => document.body.textContent.includes("cubic_check_verifier"),
    { timeout: 10000 }
  );
  console.log("  [firefox] Confirmed live veil_registry/v1 records & active packages");
  assert.equal(errors.length, 0, `Page errors: ${errors.join("; ")}`);
  await browser.close();
}

async function main() {
  const preview = spawn("npx", ["vite", "preview", "--port", "4173", "--host", "127.0.0.1"], {
    cwd: path.join(ROOT, "apps/web"),
    shell: true,
    stdio: "ignore",
  });
  try {
    await waitForServer(URL);
    await runChromiumOnyx();
    await runFirefoxOnyx();
  } finally {
    preview.kill();
  }
  console.log("\nALL REAL BROWSER-TO-ONYX E2E CHECKS PASSED.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
