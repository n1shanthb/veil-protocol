import { chromium, firefox } from "playwright";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import assert from "assert";

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

async function runBrowserSuite(browserType, name) {
  console.log(`\n=== Running Playwright E2E in ${name} ===`);
  const browser = await browserType.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
  });

  // 1. Landing page
  await page.goto(URL, { waitUntil: "networkidle" });
  const title = await page.title();
  assert(title.includes("VEIL PROTOCOL"), `Unexpected title: ${title}`);

  // 2. Local Sandbox: identity restore, join local group, Semaphore proof, vote & duplicate rejection
  await page.goto(`${URL}/studio/sandbox`, { waitUntil: "networkidle" });
  await page.fill("#sb-seed", "e2e-ci-test-identity");
  await page.click('button:has-text("Restore from Seed")');
  await page.click('button:has-text("Join Local Group")');

  await page.selectOption("#sb-poll", "42");
  await page.selectOption("#sb-opt", "2");
  const t0 = Date.now();
  await page.click('button:has-text("Generate Semaphore Proof")');
  await page.waitForFunction(
    () => document.body.textContent?.includes("Ready to simulate vote"),
    { timeout: 60000 }
  );
  console.log(`  [${name}] Client-side Semaphore v4 proof generated in ${Date.now() - t0}ms`);

  await page.click('button:has-text("Simulate Vote (Local)")');
  await page.waitForFunction(() => document.body.textContent?.includes("Vote recorded"));
  await page.click('button:has-text("Simulate Vote (Local)")');
  await page.waitForFunction(() => document.body.textContent?.includes("duplicate vote"));

  // 3. Veil Forge: import tracked VK & generate Gno verifier
  await page.goto(`${URL}/studio/forge`, { waitUntil: "networkidle" });
  const vkPath = fs.existsSync(path.join(ROOT, "circuits/build/cubic_check/verification_key.json"))
    ? path.join(ROOT, "circuits/build/cubic_check/verification_key.json")
    : path.join(ROOT, "circuits/semaphore/vk_depth10.json");
  const proofPath = fs.existsSync(path.join(ROOT, "circuits/build/cubic_check/proof.json"))
    ? path.join(ROOT, "circuits/build/cubic_check/proof.json")
    : path.join(ROOT, "circuits/semaphore/proof_depth10.json");
  const pubPath = fs.existsSync(path.join(ROOT, "circuits/build/cubic_check/public.json"))
    ? path.join(ROOT, "circuits/build/cubic_check/public.json")
    : path.join(ROOT, "circuits/semaphore/public_depth10.json");

  const vkJson = fs.readFileSync(vkPath, "utf8");
  await page.fill("#forge-vk", vkJson);
  await page.click('button:has-text("Validate & Generate Gno Verifier")');
  await page.waitForFunction(() => document.body.textContent?.includes("groth16/v2"));

  // 4. Proof Playground: valid proof + tampered public input rejection
  await page.goto(`${URL}/studio/playground`, { waitUntil: "networkidle" });
  const proofJson = fs.readFileSync(proofPath, "utf8");
  const pubJson = fs.readFileSync(pubPath, "utf8");
  await page.fill("#pg-vk", vkJson);
  await page.fill("#pg-proof", proofJson);
  await page.fill("#pg-public", pubJson);
  await page.click('button:has-text("Verify in Browser (snarkjs) & Encode for Gno")');
  await page.waitForFunction(() => document.body.textContent?.includes("BROWSER SNARKJS: VALID"));

  const pubArr = JSON.parse(pubJson);
  pubArr[0] = String(BigInt(pubArr[0]) + 1n);
  await page.fill("#pg-public", JSON.stringify(pubArr));
  await page.click('button:has-text("Verify in Browser (snarkjs) & Encode for Gno")');
  await page.waitForFunction(() => document.body.textContent?.includes("BROWSER SNARKJS: INVALID"));

  assert.strictEqual(errors.length, 0, `Browser errors in ${name}: ${errors.join("; ")}`);
  await browser.close();
}

const preview = spawn("npx", ["vite", "preview", "--port", "4173", "--host", "127.0.0.1"], {
  cwd: path.join(ROOT, "apps/web"),
  shell: true,
  stdio: "ignore",
});

try {
  await waitForServer(URL);
  await runBrowserSuite(chromium, "chromium");
  await runBrowserSuite(firefox, "firefox");
  console.log("\nALL PLAYWRIGHT E2E CHECKS PASSED.");
} finally {
  preview.kill();
}
