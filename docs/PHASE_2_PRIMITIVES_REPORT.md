# Veil Protocol — Phase 2 Primitives & Reference Application Report

**Date:** November 26, 2026  
**Status:** Phase 2 Local Exit Gate **COMPLETE** (Ceremony-backed Semaphore v4 interoperability verified in GnoVM; reusable Primitives package & Veil Vote realm implemented; all 18 adversarial tests passing; Onyx activation still pending GPAS `in review queue`).

---

## 1. Corrections & Package Provenance (Section A)

1. **Keccak-256 Right-Shift Correction:** Updated [SEMAPHORE_COMPATIBILITY.md](file:///e:/Veil%20ZK%20protocol/docs/SEMAPHORE_COMPATIBILITY.md) to explicitly distinguish zeroing the MSB (`digest[0] = 0`) from Semaphore v4's `uint256(keccak256(toBeHex(msg, 32))) >> 8` (which sets `out[0] = 0` and copies `digest[0:31]` into `out[1:32]`), and replaced premature compatibility claims.
2. **Versioning & Redeployment Plan:** The packages currently parked in GPAS (`gno.land/p/.../groth16` and `gno.land/r/.../veil_verifier`) contain the Phase 0 code. Once GPAS enables them (or when deploying to a permissionless target), Phase 1+ hardened Core (`groth16/v2` or updated deployment), `semaphore`, and `veil_vote` will be deployed in dependency order: `groth16` -> `semaphore` -> `veil_vote`.

### Package Source SHA-256 Checksums

| Artifact | SHA-256 |
| --- | --- |
| [groth16.gno](file:///e:/Veil%20ZK%20protocol/gno/p/groth16/groth16.gno) (Hardened Core) | `a7996b8dfd2fd414dc4bf371096e6d828ceef377034c0db21f49166cb5ea61c2` |
| [semaphore.gno](file:///e:/Veil%20ZK%20protocol/gno/p/semaphore/semaphore.gno) (Primitives) | `08c01aa0c2221ac014dab9faf1d2731952d99a9d48adf9664365d2f9d3dbfc8d` |
| [veil_verifier.gno](file:///e:/Veil%20ZK%20protocol/gno/r/veil_verifier/veil_verifier.gno) | `a77599fc97534c6dea9e1357b3424655565b9b08ab1b63e38f83ba55954b6376` |
| [veil_vote.gno](file:///e:/Veil%20ZK%20protocol/gno/r/veil_vote/veil_vote.gno) | `5a6dabf7aad542511dd2e3afd79c31c7874d783efd056f7618793ae87970cddf` |
| [vk_depth10.json](file:///e:/Veil%20ZK%20protocol/circuits/semaphore/vk_depth10.json) | `a6789bea2b941dbdb86e887cc9f958aa447dcbfa9ff725a886d99db2c2c47c3b` |

---

## 2. Ceremony-Backed Semaphore v4 Interoperability Gate (Section B)

- **Pinned SDK Versions:** `@semaphore-protocol/identity@4.13.0`, `@semaphore-protocol/group@4.13.0`, `@semaphore-protocol/proof@4.13.0` (MIT License).
- **Selected Depth & Artifacts:** Depth `10` (supports up to 1,024 members per group; `.wasm` and `.zkey` fetched from PSE ceremony artifacts via `@zk-kit/artifacts` for `4.13.0`; verification key extracted from `@semaphore-protocol/proof/src/verification-keys.json` into [vk_depth10.json](file:///e:/Veil%20ZK%20protocol/circuits/semaphore/vk_depth10.json)).
- **Interop Script:** [semaphore_interop.js](file:///e:/Veil%20ZK%20protocol/scripts/semaphore_interop.js) created deterministic Semaphore identities, built LeanIMT groups, generated real ceremony-backed proofs, and verified them with upstream `verifyProof(...)` (`true`).
- **Veil Forge + Veil Core Verification:**
  - Imported `vk_depth10.json` via `veil inspect` and `veil generate` into [examples/semaphore_depth10_verifier](file:///e:/Veil%20ZK%20protocol/examples/semaphore_depth10_verifier/verifier.gno).
  - Verified the identical ceremony-backed proof inside GnoVM via `veil test`: **PASS** (`TestVeilCLIProof`: `11,856,624` gas) with **zero circuit-specific changes** to Veil Core.

---

## 3. Veil Primitives (`gno/p/semaphore`) (Section C)

Implemented [semaphore.gno](file:///e:/Veil%20ZK%20protocol/gno/p/semaphore/semaphore.gno) with no voting-specific logic:
- **Canonical Hashing:** `HashToField` matches `uint256(keccak256(toBeHex(msg, 32))) >> 8` (verified bit-for-bit against SDK vectors in `TestHashToFieldMatchesSemaphoreSDK`).
- **Domain Separation:** `DomainScope(appDomain, scopeID)` prevents cross-application proof replay.
- **Native Poseidon & Root Management:** `E:\toolchains\gno\gnovm\stdlibs\crypto` contains `keccak256` and `bn254`, but **no native `poseidon` package**. Maintaining LeanIMT Poseidon(2) roots on-chain in pure interpreted Gno over `math/big` for depth-10..20 trees would be gas-prohibitive; therefore V1 uses an **authorized root publisher model** (`GroupRegistry.PublishRoot` restricted to `RootPublisher` / `Admin`), while rejecting arbitrary caller-supplied roots in `VerifyAndConsume`.
- **Atomic Nullifier Tracking:** `NullifierSet.MarkSpent` is called only after `groth16.Verify` returns `nil`.

---

## 4. Veil Vote Realm & Adversarial Testing (Sections D & E)

Implemented [veil_vote.gno](file:///e:/Veil%20ZK%20protocol/gno/r/veil_vote/veil_vote.gno) and [veil_vote_test.gno](file:///e:/Veil%20ZK%20protocol/gno/r/veil_vote/veil_vote_test.gno) (generated via [gen_vote_tests.js](file:///e:/Veil%20ZK%20protocol/scripts/gen_vote_tests.js)).

`gno test -v -root-dir E:\toolchains\gno ./gno/... ./examples/...` **passed across all 6 packages**, including `TestAdversarialVotingSuite` (`97,491,645` total suite gas) covering all 18 adversarial requirements:
- Valid member voting, multi-member voting, distinct-poll voting, and atomic tally/nullifier updates.
- Rejection of nonmember/arbitrary roots, double-voting in same poll, modified vote choices, cross-poll proofs, cross-group proofs, unsupported depths (`20`), incorrect VKs, invalid options (`99`), closed polls, unauthorized admin/membership mutations, and cross-application scope replay.
- Verified failed proof verification does **not** consume a nullifier.
- Verified exact SDK-to-Gno hash parity (`TestHashToFieldMatchesSemaphoreSDK`).

---

## 5. Privacy Threat Model & Sponsored Relayer Analysis (Section F)

- **Anonymous Group Membership:** Proven in zero-knowledge; an observer cannot link a valid vote to a specific registered `identity.commitment` in the group's LeanIMT.
- **Wallet-Level Transaction Anonymity (Not Provided Directly):** If a voter submits `Vote(...)` from their personal Gno wallet, their `g1...` address is publicly visible on-chain and in RPC logs.
- **Vote-Choice Confidentiality (Public in V1):** `optionIndex` is passed in plaintext as a public input (`message`). V1 does **not** provide secret ballots / encrypted tallies.
- **One-Identity-One-Vote vs. One-Person-One-Vote:** Enforced per registered Semaphore identity per poll scope; Sybil resistance (ensuring one human = one identity) depends on the external eligibility check performed by the group admin before calling `AddMember`.
- **Trusted Membership Administration:** The group `Admin` and `RootPublisher` are trusted to register only eligible commitments and publish accurate LeanIMT roots.
- **Minimal Sponsored Relayer (Design Note):** To decouple voter `g1...` addresses from votes, a relayer can pay gas to call `Vote(...)` with the user's already-generated `(root, nullifier, optionIndex, proof)`. **Private identity secrets (`secretScalar`) and Merkle witnesses must never leave the user's client**; the relayer only receives public proof artifacts and cannot forge a proof or alter `optionIndex` without invalidating the Groth16 proof.

---

## 6. Onyx Activation Status (Section G)

- Checked `https://gpas.latest.testnets.gno.land` throughout Phase 2: both `groth16` (`1422595`) and `veil_verifier` (`1422602`) remain `status: "review"` (`in review queue`).
- No duplicate `addpkg` transactions were submitted. Live Onyx deployment of hardened `groth16`, `semaphore`, and `veil_vote` awaits GPAS activation / organizer review.
