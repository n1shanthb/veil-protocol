import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.resolve(__dirname, "..", "bin", "veil.js");

test("CLI circuits pull, inspect, generate, verify, and reject invalid proof", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "veil-cli-test-"));
  const artDir = path.join(tmp, "mult");
  const verDir = path.join(tmp, "ver");

  const pullOut = JSON.parse(execFileSync("node", [CLI, "circuits", "pull", "multiplier", "--out", artDir, "--json"], { encoding: "utf8" }));
  assert.equal(pullOut.ok, true);
  assert.ok(pullOut.files.includes("verification_key.json"));

  const inspOut = JSON.parse(execFileSync("node", [CLI, "inspect", path.join(artDir, "verification_key.json"), "--json"], { encoding: "utf8" }));
  assert.equal(inspOut.ok, true);
  assert.equal(inspOut.nPublic, 1);

  const genOut = JSON.parse(execFileSync("node", [CLI, "generate", path.join(artDir, "verification_key.json"), "--out", verDir, "--pkgpath", "gno.land/r/test/mult", "--json"], { encoding: "utf8" }));
  assert.equal(genOut.ok, true);
  assert.ok(fs.existsSync(path.join(verDir, "verifier.gno")));

  const verOut = JSON.parse(execFileSync("node", [CLI, "verify", "--vk", path.join(artDir, "verification_key.json"), "--proof", path.join(artDir, "proof.json"), "--public", path.join(artDir, "public.json"), "--json"], { encoding: "utf8" }));
  assert.equal(verOut.ok, true);
  assert.equal(verOut.validEncoding, true);

  // Tampered public input count should fail
  const badPub = path.join(tmp, "bad_pub.json");
  fs.writeFileSync(badPub, JSON.stringify(["1", "2"]));
  assert.throws(() => {
    execFileSync("node", [CLI, "verify", "--vk", path.join(artDir, "verification_key.json"), "--proof", path.join(artDir, "proof.json"), "--public", badPub, "--json"], { encoding: "utf8" });
  });

  fs.rmSync(tmp, { recursive: true, force: true });
});
