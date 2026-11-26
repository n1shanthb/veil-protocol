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

async function runBrowserSuite(browserType, name, doRealRelayedVote) {
  console.log(`\n=== Running Playwright E2E in ${name} ===`);
  const browser = await browserType.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
  });

  await page.goto(URL, { waitUntil: "networkidle" });
  const title = await page.title();
  assert(title.includes("VEIL PROTOCOL"), `Unexpected title: ${title}`);

  // 1. Identity restore
  await page.fill("#id-secret", "veil-phase2-member-1");
  await page.click("#btn-restore-id");

  // 2. Select Poll 42, Option 2 ("No"), generate REAL client-side Semaphore v4 proof
  await page.selectOption("#poll-select", "42");
  await page.selectOption("#opt-select", "2");
  const t0 = Date.now();
  await page.click("#btn-gen-proof");
  await page.waitForFunction(
    () => document.querySelector(".status-box")?.textContent?.includes("Ready to submit"),
    { timeout: 60000 }
  );
  const proofMs = Date.now() - t0;
  console.log(`  [${name}] Client-side Semaphore v4 proof generated in ${proofMs}ms`);

  if (doRealRelayedVote) {
    // 3. Submit via real Sponsored Relayer -> real local gnoland node!
    await page.click("#btn-submit-relayer");
    await page.waitForFunction(
      () => document.querySelector(".status-box")?.textContent?.includes("Relayer (200)"),
      { timeout: 30000 }
    );
    const statusText = await page.textContent(".status-box");
    console.log(`  [${name}] Relayer response: ${statusText}`);
    assert(statusText.includes('"relayed":true'), `Expected relayed:true in ${statusText}`);
    await page.screenshot({ path: path.join(ROOT, "docs", `e2e_${name}_vote.png`), fullPage: true });
  } else {
    // Verify local dev submission in second browser
    await page.click("#btn-submit-local");
    const statusText = await page.textContent(".status-box");
    assert(statusText.includes("Vote recorded"), `Expected Vote recorded in ${statusText}`);
    // Duplicate vote rejected
    await page.click("#btn-submit-local");
    const dupText = await page.textContent(".status-box");
    assert(dupText.includes("duplicate vote"), `Expected duplicate vote rejection in ${dupText}`);
  }

  // 4. Page reload preserves clean state & identity restore works
  await page.reload({ waitUntil: "networkidle" });
  await page.fill("#id-secret", "veil-phase2-member-1");
  await page.click("#btn-restore-id");

  // 5. Veil Studio: Forge (import cubic_check verification_key.json)
  await page.click('button[data-tab="forge"]');
  const vkJson = fs.readFileSync(path.join(ROOT, "circuits/build/cubic_check/verification_key.json"), "utf8");
  await page.fill("#forge-vk", vkJson);
  await page.click("#btn-forge-gen");
  const forgeOut = await page.textContent("pre");
  assert(forgeOut.includes("groth16/v2"), "Forge output missing groth16/v2 import");

  // 6. Veil Studio: Proof Playground (real browser-side snarkjs verify: valid + tampered)
  await page.click('button[data-tab="playground"]');
  const proofJson = fs.readFileSync(path.join(ROOT, "circuits/build/cubic_check/proof.json"), "utf8");
  const pubJson = fs.readFileSync(path.join(ROOT, "circuits/build/cubic_check/public.json"), "utf8");
  await page.fill("#pg-vk", vkJson);
  await page.fill("#pg-proof", proofJson);
  await page.fill("#pg-public", pubJson);
  await page.click("#btn-pg-encode");
  await page.waitForFunction(() => document.body.textContent.includes("BROWSER SNARKJS VERIFICATION: VALID"));
  const pgOut = await page.textContent("pre");
  assert(pgOut.includes("A (G1 64B):"), "Playground missing encoded A");
  assert(pgOut.includes("B (G2 128B EIP-197):"), "Playground missing encoded B");

  // Tampered public input must fail browser snarkjs verification
  await page.fill("#pg-public", '["999999"]');
  await page.click("#btn-pg-encode");
  await page.waitForFunction(() => document.body.textContent.includes("BROWSER SNARKJS VERIFICATION: INVALID"));

  // 7. Remaining Studio tabs
  for (const tab of ["circuits", "deployments", "primitives"]) {
    await page.click(`button[data-tab="${tab}"]`);
    const bodyText = await page.textContent("main");
    assert(bodyText.length > 50, `Empty tab ${tab}`);
  }

  assert.equal(errors.length, 0, `Browser errors in ${name}: ${errors.join("; ")}`);
  await browser.close();
  console.log(`  [${name}] ALL E2E CHECKS PASSED (0 console/page errors)`);
}

async function main() {
  const preview = spawn("npx", ["vite", "preview", "--port", "4173", "--host", "127.0.0.1"], {
    cwd: path.join(ROOT, "apps/web"),
    shell: true,
    stdio: "ignore",
  });
  try {
    await waitForServer(URL);
    await runBrowserSuite(chromium, "chromium", true);
    await runBrowserSuite(firefox, "firefox", false);
  } finally {
    preview.kill();
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
