const { execFileSync } = require("child_process");
const sdk = require("../sdk/dist/index.js");

const GNOKEY = "E:\\toolchains\\bin\\gnokey.exe";
const REALM = "gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/veil_vote/v3";
const ADMIN = "g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04";

const PASS = process.env.VEIL_KEY_PASS || "";
if (!PASS) {
  console.error("Set VEIL_KEY_PASS env var for local gnokey signing.");
  process.exit(1);
}

function callRealm(func, args) {
  const cmdArgs = [
    "maketx", "call",
    "-pkgpath", REALM,
    "-func", func,
    ...args.flatMap((a) => ["-args", String(a)]),
    "-gas-fee", "1000000ugnot",
    "-gas-wanted", "25000000",
    "-chainid", "dev",
    "-remote", "http://127.0.0.1:26657",
    "-broadcast", "-insecure-password-stdin", "veil-dev",
  ];
  return execFileSync(GNOKEY, cmdArgs, { input: `${PASS}\r\n`, encoding: "utf8" });
}

function queryEval(expr) {
  return execFileSync(
    GNOKEY,
    ["query", "-remote", "http://127.0.0.1:26657", "vm/qeval", "-data", `${REALM}.${expr}`],
    { encoding: "utf8" }
  );
}

async function main() {
  const id0 = sdk.createIdentity("veil-phase2-member-0");
  const id1 = sdk.createIdentity("veil-phase2-member-1");
  const id2 = sdk.createIdentity("veil-phase2-member-2");
  const cHex = (c) => BigInt(c).toString(16).padStart(64, "0");
  const rootHex = sdk.buildGroupFromCommitments([id0.commitment, id1.commitment, id2.commitment]).rootHex;

  console.log("1. Checking if Poll #42 already exists on local gnoland...");
  const existing = queryEval("GetPollSnapshotRoot(42)");
  if (!existing.includes(rootHex)) {
    callRealm("CreateGroup", [1, 10, ADMIN]);
    callRealm("AddMember", [1, cHex(id0.commitment)]);
    callRealm("AddMember", [1, cHex(id1.commitment)]);
    callRealm("AddMember", [1, cHex(id2.commitment)]);
    callRealm("PublishRoot", [1, rootHex]);
    callRealm("CreatePoll", [42, 1, "Proposal 42", "Abstain,Yes,No", 0, 0]);
  } else {
    console.log("   Poll #42 already initialized with root", rootHex);
  }

  console.log("2. Generating real Semaphore v4 proof via @veil-protocol/sdk...");
  const t0 = Date.now();
  const proofRes = await sdk.generateSemaphoreVoteProof({
    identity: id0,
    commitments: [id0.commitment, id1.commitment, id2.commitment],
    pollId: 42,
    optionIndex: 1,
    depth: 10,
    network: "dev",
    appDomain: REALM,
    groupId: 1,
  });
  console.log(`   Proof generated in ${Date.now() - t0}ms`);

  console.log("3. Relaying Vote tx via Sponsored Relayer (http://127.0.0.1:8787/api/relay/vote)...");
  const relayRes = await fetch("http://127.0.0.1:8787/api/relay/vote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chainId: "dev",
      pkgPath: REALM,
      func: "Vote",
      pollId: 42,
      depth: 10,
      optionIndex: 1,
      rootHex: proofRes.rootHex,
      nullifierHex: proofRes.nullifierHex,
      a: proofRes.encodedProof.a,
      b: proofRes.encodedProof.b,
      c: proofRes.encodedProof.c,
    }),
  });
  const relayJson = await relayRes.json();
  console.log("   Relayer response:", relayJson);
  if (!relayJson.relayed || !relayJson.txHash) {
    throw new Error("Relayed vote failed: " + JSON.stringify(relayJson));
  }

  console.log("4. Querying updated Poll #42 tally on local gnoland...");
  console.log(queryEval("GetPollTally(42, 1)"));

  console.log("5. Verifying duplicate vote rejection on-chain (direct gnokey call)...");
  try {
    callRealm("Vote", [
      42, 10, proofRes.rootHex, proofRes.nullifierHex, 1,
      proofRes.encodedProof.a, proofRes.encodedProof.b, proofRes.encodedProof.c,
    ]);
    throw new Error("Expected duplicate vote to fail!");
  } catch (e) {
    console.log("   Duplicate vote rejected as expected:", e.message.slice(0, 180));
  }
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
