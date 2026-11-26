const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Identity } = require("@semaphore-protocol/identity");
const { Group } = require("@semaphore-protocol/group");
const { generateProof, verifyProof, unpackGroth16Proof } = require("@semaphore-protocol/proof");
const { keccak256, toBeHex } = require("ethers");

const DEPTH = 10;
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "circuits", "semaphore");
fs.mkdirSync(OUT_DIR, { recursive: true });

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function semHash(valBigInt) {
  return (BigInt(keccak256(toBeHex(valBigInt, 32))) >> 8n).toString();
}

function decTo32Hex(dec) {
  return BigInt(dec).toString(16).padStart(64, "0");
}

function g1ToHex(pt) {
  return decTo32Hex(pt[0]) + decTo32Hex(pt[1]);
}

function g2ToHexEIP197(pt) {
  return (
    decTo32Hex(pt[0][1]) +
    decTo32Hex(pt[0][0]) +
    decTo32Hex(pt[1][1]) +
    decTo32Hex(pt[1][0])
  );
}

async function main() {
  // 1. Extract depth-10 ceremony-backed VK from @semaphore-protocol/proof@4.13.0
  const allVksPath = path.join(
    ROOT,
    "node_modules",
    "@semaphore-protocol",
    "proof",
    "src",
    "verification-keys.json"
  );
  const allVks = JSON.parse(fs.readFileSync(allVksPath, "utf8"));
  const vkDepth = {
    protocol: allVks.protocol,
    curve: allVks.curve,
    nPublic: 4,
    vk_alpha_1: allVks.vk_alpha_1,
    vk_beta_2: allVks.vk_beta_2,
    vk_gamma_2: allVks.vk_gamma_2,
    vk_delta_2: allVks.vk_delta_2[DEPTH - 1],
    vk_alphabeta_12: allVks.vk_alphabeta_12,
    IC: allVks.IC[DEPTH - 1],
  };

  const vkOutPath = path.join(OUT_DIR, `vk_depth${DEPTH}.json`);
  fs.writeFileSync(vkOutPath, JSON.stringify(vkDepth, null, 2));
  console.log(`Wrote ${vkOutPath} (sha256: ${sha256File(vkOutPath)})`);

  // 2. Deterministic identities & group for reproducible fixtures
  const id0 = new Identity("veil-phase2-member-0");
  const id1 = new Identity("veil-phase2-member-1");
  const id2 = new Identity("veil-phase2-member-2");
  const nonMember = new Identity("veil-phase2-non-member");

  const group = new Group([id0.commitment, id1.commitment, id2.commitment]);
  console.log("Group root (dec):", group.root.toString());
  console.log("Group root (hex):", decTo32Hex(group.root));

  // 3. Generate real ceremony-backed proof for id0: vote option 1, poll scope 42
  const message = 1n;
  const scope = 42n;
  const proof0 = await generateProof(id0, group, message, scope, DEPTH);
  const okUpstream = await verifyProof(proof0);
  console.log("Upstream @semaphore-protocol/proof verifyProof(proof0):", okUpstream);
  if (!okUpstream) throw new Error("Upstream verification failed!");

  // Also generate proof for id1 (same poll, option 2) and id0 (poll scope 43, option 2)
  const proof1 = await generateProof(id1, group, 2n, scope, DEPTH);
  const proof0Poll2 = await generateProof(id0, group, 2n, 43n, DEPTH);

  // Also generate proof for a second group (group2 = [id1, id2])
  const group2 = new Group([id1.commitment, id2.commitment]);
  const proofGroup2 = await generateProof(id1, group2, 1n, scope, DEPTH);

  // Export snarkjs-format proof & public signals for proof0 (for Veil Forge CLI test)
  const unpacked0 = unpackGroth16Proof(proof0.points);
  const public0 = [
    proof0.merkleTreeRoot,
    proof0.nullifier,
    semHash(message),
    semHash(scope),
  ];
  fs.writeFileSync(path.join(OUT_DIR, `proof_depth${DEPTH}.json`), JSON.stringify(unpacked0, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, `public_depth${DEPTH}.json`), JSON.stringify(public0, null, 2));

  function packProof(semProof) {
    const u = unpackGroth16Proof(semProof.points);
    return {
      a: g1ToHex(u.pi_a),
      b: g2ToHexEIP197(u.pi_b),
      c: g1ToHex(u.pi_c),
      rootHex: decTo32Hex(semProof.merkleTreeRoot),
      nullifierHex: decTo32Hex(semProof.nullifier),
      messageDec: semProof.message,
      messageHex: decTo32Hex(semProof.message),
      messageHashHex: decTo32Hex(semHash(BigInt(semProof.message))),
      scopeDec: semProof.scope,
      scopeHex: decTo32Hex(semProof.scope),
      scopeHashHex: decTo32Hex(semHash(BigInt(semProof.scope))),
    };
  }

  const fixtures = {
    semaphoreVersion: "4.13.0",
    depth: DEPTH,
    vkSha256: sha256File(vkOutPath),
    vk: {
      alpha: g1ToHex(vkDepth.vk_alpha_1),
      beta: g2ToHexEIP197(vkDepth.vk_beta_2),
      gamma: g2ToHexEIP197(vkDepth.vk_gamma_2),
      delta: g2ToHexEIP197(vkDepth.vk_delta_2),
      ic: vkDepth.IC.map(g1ToHex),
    },
    identities: {
      id0CommitmentHex: decTo32Hex(id0.commitment),
      id1CommitmentHex: decTo32Hex(id1.commitment),
      id2CommitmentHex: decTo32Hex(id2.commitment),
      nonMemberCommitmentHex: decTo32Hex(nonMember.commitment),
    },
    group1RootHex: decTo32Hex(group.root),
    group2RootHex: decTo32Hex(group2.root),
    proofs: {
      id0_poll42_opt1: packProof(proof0),
      id1_poll42_opt2: packProof(proof1),
      id0_poll43_opt2: packProof(proof0Poll2),
      id1_group2_poll42_opt1: packProof(proofGroup2),
    },
  };

  const fixturesPath = path.join(OUT_DIR, `fixtures_depth${DEPTH}.json`);
  fs.writeFileSync(fixturesPath, JSON.stringify(fixtures, null, 2));
  console.log(`Wrote ${fixturesPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
