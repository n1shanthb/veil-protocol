import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "veil-accept-"));
console.log(`Acceptance dir: ${tmp}`);

try {
  // 1. Pack all 3 packages
  execSync(`npm pack --pack-destination "${tmp}"`, { cwd: path.join(ROOT, "sdk"), stdio: "ignore" });
  execSync(`npm pack --pack-destination "${tmp}"`, { cwd: path.join(ROOT, "packages", "cli"), stdio: "ignore" });
  execSync(`npm pack --pack-destination "${tmp}"`, { cwd: path.join(ROOT, "packages", "mcp"), stdio: "ignore" });

  // 2. Install into clean external directory
  execSync("npm init -y", { cwd: tmp, stdio: "ignore" });
  execSync("npm install ./veil-zk-sdk-0.1.0.tgz ./veil-zk-cli-0.1.0.tgz ./veil-zk-mcp-0.1.0.tgz", { cwd: tmp, stdio: "ignore" });

  const npx = (cmd) => execSync(`npx ${cmd}`, { cwd: tmp, encoding: "utf8" });

  // 3. Doctor
  const doc = JSON.parse(npx("veil doctor --json"));
  assert.equal(doc.ok, true);
  console.log("1. doctor: PASS", doc.onyxRpc);

  // 4. Pull multiplier artifacts
  const pull = JSON.parse(npx("veil circuits pull multiplier --out ./mult --json"));
  assert.equal(pull.ok, true);
  console.log("2. circuits pull: PASS");

  // 5. Generate fresh proof from new witness (7 * 13 = 91)
  fs.writeFileSync(path.join(tmp, "input.json"), JSON.stringify({ a: "7", b: "13" }));
  const prove = JSON.parse(npx("veil prove --wasm ./mult/multiplier.wasm --zkey ./mult/multiplier_final.zkey --input ./input.json --out-proof ./fresh_proof.json --out-public ./fresh_public.json --json"));
  assert.equal(prove.ok, true);
  assert.deepEqual(prove.publicSignals, ["91"]);
  console.log("3. prove (fresh witness): PASS");

  // 6. Verify fresh proof
  const ver = JSON.parse(npx("veil verify --vk ./mult/verification_key.json --proof ./fresh_proof.json --public ./fresh_public.json --json"));
  assert.equal(ver.valid, true);
  console.log("4. verify (valid proof): PASS");

  // 7. Reject incorrect public statement
  fs.writeFileSync(path.join(tmp, "wrong_pub.json"), JSON.stringify(["92"]));
  assert.throws(() => npx("veil verify --vk ./mult/verification_key.json --proof ./fresh_proof.json --public ./wrong_pub.json --json"));
  console.log("5. verify (reject wrong statement): PASS");

  // 8. Generate Gno verifier
  const gen = JSON.parse(npx("veil generate ./mult/verification_key.json --out ./ver --pkgpath gno.land/r/test/ver --json"));
  assert.equal(gen.ok, true);
  console.log("6. generate Gno verifier: PASS");

  // 9. Compile and test in GnoVM (mandatory)
  const gnoRes = JSON.parse(npx("veil test --dir ./ver --proof ./fresh_proof.json --public ./fresh_public.json --json"));
  assert.equal(gnoRes.ok, true);
  assert.ok(gnoRes.output.includes("TestVerifyGeneratedProof"));
  console.log("7. GnoVM test: PASS");

  // 10. Prepare deployment
  const dep = JSON.parse(npx("veil deploy ./ver --pkgpath gno.land/r/test/ver --dry-run --json"));
  assert.equal(dep.dryRun, true);
  console.log("8. deploy --dry-run: PASS");

  // 11. MCP tools/call
  const mcpBin = path.join(tmp, "node_modules", "@veil-zk", "mcp", "bin", "veil-mcp.js");
  const mcpOut = execFileSync(process.execPath, [mcpBin], {
    cwd: tmp,
    input: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "veil_deployment_status", arguments: { pkgPath: "gno.land/p/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/groth16/v2" } },
    }) + "\n",
    encoding: "utf8",
  });
  const mcpJson = JSON.parse(mcpOut.trim());
  assert.equal(JSON.parse(mcpJson.result.content[0].text).status, "ACTIVE");
  console.log("9. MCP tools/call: PASS");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
