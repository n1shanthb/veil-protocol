import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MCP = path.resolve(__dirname, "..", "bin", "veil-mcp.js");
const sdk = require("../../../sdk/dist/index.js");

const MULT_DIR = path.resolve(__dirname, "..", "..", "cli", "artifacts", "multiplier");
const vk = JSON.parse(fs.readFileSync(path.join(MULT_DIR, "verification_key.json"), "utf8"));
const proof = JSON.parse(fs.readFileSync(path.join(MULT_DIR, "proof.json"), "utf8"));
const pub = JSON.parse(fs.readFileSync(path.join(MULT_DIR, "public.json"), "utf8"));

function callMcp(method, params) {
  const out = execFileSync("node", [MCP], {
    input: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) + "\n",
    encoding: "utf8",
  });
  return JSON.parse(out.trim());
}

test("MCP rejects incomplete VK, matches SDK encoding byte-for-byte, and verifies proofs", () => {
  // 1. Incomplete VK must error
  const badVkRes = callMcp("tools/call", {
    name: "veil_inspect_vk",
    arguments: { vk: { protocol: "groth16", curve: "bn128", IC: [["1", "2"], ["3", "4"]] } },
  });
  assert.ok(badVkRes.error, "Expected error for incomplete VK");

  // 2. Byte-for-byte encoding parity with SDK
  const encRes = callMcp("tools/call", {
    name: "veil_encode_gno",
    arguments: { proof, publicInputs: pub },
  });
  const encParsed = JSON.parse(encRes.result.content[0].text);
  const sdkEnc = sdk.validateAndConvertProof(proof);
  assert.equal(encParsed.a, sdkEnc.a);
  assert.equal(encParsed.b, sdkEnc.b);
  assert.equal(encParsed.c, sdkEnc.c);
  assert.equal(encParsed.packedHex, sdkEnc.packedHex);

  // 3. Valid proof verification
  const okRes = callMcp("tools/call", {
    name: "veil_verify_proof",
    arguments: { vk, proof, publicInputs: pub },
  });
  assert.equal(JSON.parse(okRes.result.content[0].text).valid, true);

  // 4. Wrong public input returns valid: false
  const wrongRes = callMcp("tools/call", {
    name: "veil_verify_proof",
    arguments: { vk, proof, publicInputs: ["92"] },
  });
  assert.equal(JSON.parse(wrongRes.result.content[0].text).valid, false);
});
