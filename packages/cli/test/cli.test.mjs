import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.resolve(__dirname, "..", "bin", "veil.js");

test("CLI genuine Groth16 verify, encode, and mathematical rejection", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "veil-cli-test-"));
  const artDir = path.join(tmp, "mult");
  const verDir = path.join(tmp, "ver");

  execFileSync("node", [CLI, "circuits", "pull", "multiplier", "--out", artDir, "--json"]);
  const vk = path.join(artDir, "verification_key.json");
  const proof = path.join(artDir, "proof.json");
  const pub = path.join(artDir, "public.json");

  // 1. Valid proof passes cryptographic verification
  const verOut = JSON.parse(execFileSync("node", [CLI, "verify", "--vk", vk, "--proof", proof, "--public", pub, "--json"], { encoding: "utf8" }));
  assert.equal(verOut.ok, true);
  assert.equal(verOut.valid, true);

  // 2. Same-length but mathematically wrong public input ["92"] MUST fail
  const wrongPub = path.join(tmp, "wrong_pub.json");
  fs.writeFileSync(wrongPub, JSON.stringify(["92"]));
  assert.throws(() => {
    execFileSync("node", [CLI, "verify", "--vk", vk, "--proof", proof, "--public", wrongPub, "--json"], { encoding: "utf8" });
  });

  // 3. Tampered proof coordinate MUST fail
  const pObj = JSON.parse(fs.readFileSync(proof, "utf8"));
  pObj.pi_a[0] = "12345";
  const badProof = path.join(tmp, "bad_proof.json");
  fs.writeFileSync(badProof, JSON.stringify(pObj));
  assert.throws(() => {
    execFileSync("node", [CLI, "verify", "--vk", vk, "--proof", badProof, "--public", pub, "--json"], { encoding: "utf8" });
  });

  // 4. Generate Gno verifier
  const genOut = JSON.parse(execFileSync("node", [CLI, "generate", vk, "--out", verDir, "--pkgpath", "gno.land/r/test/mult", "--json"], { encoding: "utf8" }));
  assert.equal(genOut.ok, true);
  assert.ok(fs.existsSync(path.join(verDir, "verifier.gno")));

  fs.rmSync(tmp, { recursive: true, force: true });
});
