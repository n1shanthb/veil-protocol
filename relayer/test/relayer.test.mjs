import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createServer, validateVoteRelayPayload } = require("../server.js");

const validPayload = {
  pollId: 42,
  depth: 10,
  optionIndex: 1,
  rootHex: "11".repeat(32),
  nullifierHex: "22".repeat(32),
  a: "aa".repeat(64),
  b: "bb".repeat(128),
  c: "cc".repeat(64),
};

test("schema rejects unknown fields, secrets, unauthorized realms/chains/methods", () => {
  assert.match(validateVoteRelayPayload({ ...validPayload, secretScalar: "123" }), /unknown or forbidden/);
  assert.match(validateVoteRelayPayload({ ...validPayload, witness: {} }), /unknown or forbidden/);
  assert.match(validateVoteRelayPayload({ ...validPayload, func: "ArbitraryCall" }), /unauthorized method/);
  assert.match(validateVoteRelayPayload({ ...validPayload, pkgPath: "gno.land/r/evil/realm" }), /unauthorized pkgPath/);
  assert.match(validateVoteRelayPayload({ ...validPayload, chainId: "evil-net" }), /unauthorized chainId/);
  assert.equal(validateVoteRelayPayload(validPayload), null);
});

test("concurrent duplicates, failed tx retry, persistent budget & restart recovery", async () => {
  const stateFile = path.join(os.tmpdir(), `veil-relayer-test-${Date.now()}.json`);
  let failFirst = true;
  let calls = 0;

  const srv1 = createServer({
    stateFile,
    dailyBudgetUgnot: 1_500_000,
    executor: async () => {
      calls++;
      await new Promise((r) => setTimeout(r, 25));
      if (failFirst) {
        failFirst = false;
        throw new Error("rpc timeout");
      }
      return { mode: "broadcast", relayed: true, txHash: `TX_${calls}`, gasUsed: 3320000 };
    },
  });
  await new Promise((r) => srv1.listen(0, "127.0.0.1", r));
  const base1 = `http://127.0.0.1:${srv1.address().port}`;

  try {
    // 1. Failed tx returns 502 and does NOT consume budget or cache idempotency.
    const rFail = await fetch(`${base1}/api/relay/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    });
    assert.equal(rFail.status, 502);

    // 2. Concurrent duplicate submissions: one succeeds (200), concurrent one gets 409 in-flight.
    const [c1, c2] = await Promise.all([
      fetch(`${base1}/api/relay/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validPayload),
      }),
      fetch(`${base1}/api/relay/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validPayload),
      }),
    ]);
    const statuses = [c1.status, c2.status].sort();
    assert.deepEqual(statuses, [200, 409]);
  } finally {
    srv1.close();
  }

  // 3. Process restart preserves spent budget and idempotency from stateFile.
  const srv2 = createServer({
    stateFile,
    dailyBudgetUgnot: 1_500_000,
    executor: async () => ({ mode: "broadcast", relayed: true, txHash: "SHOULD_NOT_RUN", gasUsed: 1 }),
  });
  await new Promise((r) => srv2.listen(0, "127.0.0.1", r));
  const base2 = `http://127.0.0.1:${srv2.address().port}`;
  try {
    // Same nullifier returns cached idempotent result.
    const rIdem = await fetch(`${base2}/api/relay/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    });
    const jIdem = await rIdem.json();
    assert.equal(jIdem.idempotent, true);

    // New nullifier hits depleted daily budget (1_000_000 spent + 1_000_000 > 1_500_000).
    const rBudget = await fetch(`${base2}/api/relay/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...validPayload, nullifierHex: "33".repeat(32) }),
    });
    assert.equal(rBudget.status, 503);
  } finally {
    srv2.close();
    fs.rmSync(stateFile, { force: true });
  }
});
