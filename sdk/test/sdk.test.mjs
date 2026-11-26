import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sdk = require("../dist/index.js");

const ROOT = path.resolve(import.meta.dirname, "../..");
const vkDepth10 = JSON.parse(
  fs.readFileSync(path.join(ROOT, "circuits/semaphore/vk_depth10.json"), "utf8")
);
const proofDepth10 = JSON.parse(
  fs.readFileSync(path.join(ROOT, "circuits/semaphore/proof_depth10.json"), "utf8")
);

test("1-5. validateAndConvertVK rejects malformed, unsupported, missing/excess coords, noncanonical", () => {
  const enc = sdk.validateAndConvertVK(vkDepth10);
  assert.equal(enc.nPublic, 4);
  assert.equal(enc.ic.length, 5);

  assert.throws(
    () => sdk.validateAndConvertVK({ ...vkDepth10, protocol: "plonk" }),
    (e) => e.code === "INVALID_VK"
  );
  assert.throws(
    () => sdk.validateAndConvertVK({ ...vkDepth10, curve: "bls12381" }),
    (e) => e.code === "INVALID_VK"
  );
  assert.throws(
    () => sdk.validateAndConvertVK({ ...vkDepth10, vk_alpha_1: ["1"] }),
    (e) => e.code === "INVALID_VK"
  );
  assert.throws(
    () => sdk.validateAndConvertVK({ ...vkDepth10, vk_beta_2: [["1"]] }),
    (e) => e.code === "INVALID_VK"
  );
  assert.throws(
    () => sdk.validateAndConvertVK({ ...vkDepth10, nPublic: 99 }),
    (e) => e.code === "INVALID_VK"
  );
  assert.throws(
    () => sdk.validateAndConvertVK({ ...vkDepth10, vk_alpha_1: ["-1", "2", "1"] }),
    (e) => e.code === "NON_CANONICAL_FIELD"
  );
  assert.throws(
    () => sdk.validateAndConvertVK({ ...vkDepth10, vk_alpha_1: [sdk.BN254_P.toString(), "2", "1"] }),
    (e) => e.code === "NON_CANONICAL_FIELD"
  );
});

test("6. encodePublicInputs rejects negative, noncanonical, and oversized arrays", () => {
  assert.throws(() => sdk.encodePublicInputs(["-5"]), (e) => e.code === "NON_CANONICAL_FIELD");
  assert.throws(
    () => sdk.encodePublicInputs([sdk.BN254_R.toString()]),
    (e) => e.code === "NON_CANONICAL_FIELD"
  );
  const tooMany = new Array(sdk.MAX_PUBLIC_INPUTS + 1).fill("1");
  assert.throws(() => sdk.encodePublicInputs(tooMany), (e) => e.code === "TOO_MANY_PUBLIC_INPUTS");
});

test("7-8. Proof encoding & G2 conversion parity with Forge", () => {
  const enc = sdk.validateAndConvertProof(proofDepth10);
  assert.equal(enc.a.length, 128);
  assert.equal(enc.b.length, 256);
  assert.equal(enc.c.length, 128);
  assert.equal(enc.packedHex, enc.a + enc.b + enc.c);

  assert.throws(
    () => sdk.validateAndConvertProof({ ...proofDepth10, pi_a: ["not-int", "2"] }),
    (e) => e.code === "NON_CANONICAL_FIELD"
  );
});

test("9. SDK-to-Gno canonical scope & message hashing parity", () => {
  assert.equal(
    sdk.semaphoreHashToField(1n),
    "00b10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0c"
  );
  const scopeDev = sdk.deriveCanonicalScope(
    "dev",
    "gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/veil_vote/v1",
    1,
    42
  );
  const scopeOnyx = sdk.deriveCanonicalScope(
    "onyx-1",
    "gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/veil_vote/v1",
    1,
    42
  );
  assert.equal(scopeDev.length, 64);
  assert.ok(scopeDev.startsWith("00"));
  assert.notEqual(scopeDev, scopeOnyx);
});

test("10. Semaphore v4 real proof generation and transaction arg serialization", async () => {
  const id0 = sdk.createIdentity("veil-phase2-member-0");
  const id1 = sdk.createIdentity("veil-phase2-member-1");
  const id2 = sdk.createIdentity("veil-phase2-member-2");
  const res = await sdk.generateSemaphoreVoteProof({
    identity: id0,
    commitments: [id0.commitment, id1.commitment, id2.commitment],
    pollId: 42,
    optionIndex: 1,
    depth: 10,
    network: "dev",
    groupId: 1,
  });
  const call = sdk.buildVoteCallArgs({
    pkgPath: "gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/veil_vote/v1",
    pollId: 42,
    depth: 10,
    rootHex: res.rootHex,
    nullifierHex: res.nullifierHex,
    optionIndex: 1,
    proof: res.encodedProof,
  });
  assert.equal(call.func, "Vote");
  assert.equal(call.args.length, 8);
});

test("11. RPC failures and malformed responses throw typed VeilError", async () => {
  const srv = http.createServer((req, res) => {
    res.writeHead(500);
    res.end("boom");
  });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const port = srv.address().port;
  try {
    await assert.rejects(
      () => sdk.queryRealmRender(`http://127.0.0.1:${port}`, "gno.land/r/test"),
      (e) => e instanceof sdk.VeilError && e.code === "RPC_ERROR"
    );
  } finally {
    srv.close();
  }
});

test.after(async () => {
  if (globalThis.curve_bn128) {
    await globalThis.curve_bn128.terminate();
  }
});
