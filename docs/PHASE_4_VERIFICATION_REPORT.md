# Veil Protocol — Phase 4 Verification & Release Hardening Report

**Date:** November 26, 2026  
**Local Release Readiness Verdict:** **GO**  
**Public Testnet (`onyx-1`) Readiness Verdict:** **NO-GO** *(All 5 submitted packages remain in GPAS `review` status awaiting `MsgEnablePackage` activation; live Onyx execution cannot be declared until activated.)*

---

## 1. Onyx Activation Status (Section A)

Queried `https://gpas.latest.testnets.gno.land/api/packages` for all 5 submitted packages:

| Package Path | Release | Height | Tx Hash | GPAS Status |
| --- | --- | --- | --- | --- |
| `.../groth16` | Phase 0 (obsolete) | `1422595` | `Lzw58UhljTFqrBYQIsSZdFwhdUo8RaHfm0ky9SjVM6o=` | `review` (`2026-11-26T08:51:04Z`) |
| `.../veil_verifier` | Phase 0 (obsolete) | `1422602` | `N1Z0qlZmpyleq3g3hs95+ss/d9Gx+FRz3SmEiDelvBo=` | `review` (`2026-11-26T08:51:04Z`) |
| `.../groth16/v2` | Phase 3+ Hardened Core | `1426060` | `U61xv6bC85z9VopmocG5DV7iumLhEOEtCLC8TEESZPU=` | `review` (`2026-11-26T12:13:05Z`) |
| `.../semaphore/v1` | Phase 3+ Primitives | `1426062` | `mxqRc626QF0xkVDz4wq7lPdBqO7W4C21EHvy1znI4Uc=` | `review` (`2026-11-26T12:13:05Z`) |
| `.../veil_vote/v1` | Phase 3+ Vote Realm | `1426064` | `VtbiZcm4THMczuVCQ0KRuevbXQgAsod5cNOh0zPLaXo=` | `review` (`2026-11-26T12:13:05Z`) |

No packages were refused; all 5 remain `in review queue`.

---

## 2. Independent Repository Audit & Remediations (Section B)

| ID | Severity | File & Lines | Finding | Remediation Applied |
| --- | --- | --- | --- | --- |
| **AUD-01** | **High** | `gno/r/veil_vote/veil_vote.gno:19-30`, `gno/p/semaphore/semaphore.gno:292-330` | Active polls accepted any historical/future root of `groupID`, allowing post-poll membership changes to alter an active poll's electorate. | Added `Poll.SnapshotRoot` / `SnapshotVersion` frozen at `CreatePoll` and enforced `VerifyAndConsumeSnapshot`. |
| **AUD-02** | **High** | `gno/r/veil_vote/veil_vote.gno:165`, `sdk/src/index.ts:230` | `Vote` used raw `pollID` as scope instead of `DomainScopeFull(network, appDomain, groupID, pollID)`. | Reconciled `DomainScopeFull` in Gno and `deriveCanonicalScope` in `@veil-protocol/sdk` + `apps/web`. |
| **AUD-03** | **High** | `relayer/server.js:184,298` | Relayer lacked strict `(chainId, pkgPath, func)` + unknown-field checks, had in-memory-only budget/idempotency, passed `\n` instead of `\r\n` on Windows `gnokey`, and crashed (`ERR_HTTP_INVALID_STATUS_CODE: 1`) when `execFileSync` threw `.status = 1`. | Enforced strict schema & `(chainId, pkgPath, Vote)` allowlist, persistent state file, serial signing mutex, `\r\n` stdin, and `e.httpStatus \|\| 502`. |
| **AUD-04** | **Medium** | `gno/r/veil_vote/veil_vote.gno:225-248` | Clients lacked on-chain read helpers to fetch group commitments and frozen poll snapshot roots. | Added `GetGroupCommitments(groupID)` and `GetPollSnapshotRoot(pollID)`. |
| **AUD-05** | **Medium** | `apps/web/src/main.ts:291` | Proof Playground did not explicitly state it only encodes artifacts without local Groth16 pairing. | Added explicit notice distinguishing local encoding, GnoVM `veil test`, and Onyx RPC. |

---

## 3. Requirements-to-Evidence Matrix

| Requirement | Evidence |
| --- | --- |
| **A. Onyx GPAS diagnostics** | `gpas.latest.testnets.gno.land` API output for all 5 packages (`status: "review"`). |
| **B. Security audit & fixes** | All 5 findings (`AUD-01`..`AUD-05`) remediated and verified in `gno test`, `sdk`, `relayer`, and `e2e.mjs`. |
| **C. Browser-to-Gno interop** | `deriveCanonicalScope` in [sdk/src/index.ts](file:///e:/Veil%20ZK%20protocol/sdk/src/index.ts) + [veil-browser.ts](file:///e:/Veil%20ZK%20protocol/apps/web/src/veil-browser.ts) matches `semaphore.DomainScopeFull` in [veil_vote.gno](file:///e:/Veil%20ZK%20protocol/gno/r/veil_vote/veil_vote.gno); verified by `sdk.test.mjs` and `veil_vote_test.gno`. |
| **D. Immutable poll snapshots** | `TestAdversarialVotingSuite` in [veil_vote_test.gno](file:///e:/Veil%20ZK%20protocol/gno/r/veil_vote/veil_vote_test.gno) (`90,265,230` gas, PASS) proves post-poll `PublishRoot` does not mutate `GetPollSnapshotRoot(42)` and rejects newly added members in Poll 42. |
| **E. Real browser E2E (2 browsers)** | [apps/web/e2e.mjs](file:///e:/Veil%20ZK%20protocol/apps/web/e2e.mjs) against production `vite preview` + local `gnoland` + Sponsored Relayer: **Chromium** (`5897ms` proof gen, `txHash: NOGx/iMu6xpi1lWQO/uR/+ryMoibIZyzbi0o4GE0IwM=`, `gasUsed: 16674071`, `height: 60`, `0` errors; [e2e_chromium_vote.png](file:///e:/Veil%20ZK%20protocol/docs/e2e_chromium_vote.png)) and **Firefox** (`1840ms` proof gen, `0` errors). |
| **F. Veil Studio workflows** | Tested in `e2e.mjs` (Forge with `cubic_check` VK, Proof Playground, Circuit Library, Deployments, Primitives). |
| **G. SDK test suite** | [sdk/test/sdk.test.mjs](file:///e:/Veil%20ZK%20protocol/sdk/test/sdk.test.mjs): **6/6 PASS** (`1.77s`). |
| **H. Hardened Relayer & local tx** | [relayer/test/relayer.test.mjs](file:///e:/Veil%20ZK%20protocol/relayer/test/relayer.test.mjs): **2/2 PASS**; [local_e2e_relay.js](file:///e:/Veil%20ZK%20protocol/scripts/local_e2e_relay.js): real relayed `Vote` on local `gnoland` (`txHash: +b8eV3SsrCleBuRpAiciGIlrFO8yPzViXdqQb8mDWi0=`, `gasUsed: 16673021`, `height: 40`), `GetPollTally(42, 1) == (1 uint64)`, duplicate vote rejected (`semaphore: nullifier already used in scope`). |
| **I. Clean-machine Linux CI** | [.github/workflows/ci.yml](file:///e:/Veil%20ZK%20protocol/.github/workflows/ci.yml) pins `gnolang/gno` `v1.8.0-rc.1` (`fc79041f4cd1a7b3ed4b316dc5ac14162eb78730`), verifies SHA-256 checksums, and runs Gno, SDK, Relayer, and Web builds. |

---

## 4. Verified Test & Package Counts

- **Gno Packages Passing `gno test` (8/8):** `gno/p/groth16` (18 tests), `gno/p/semaphore` (5 tests), `gno/r/veil_verifier` (1 test), `gno/r/veil_vote` (1 suite), `examples/multiplier_verifier` (1 test), `examples/sum_of_squares_verifier` (1 test), `examples/semaphore_depth10_verifier` (1 test), `examples/cubic_check_verifier` (1 test).
- **TypeScript SDK (`sdk/test/sdk.test.mjs`):** 6/6 PASS.
- **Sponsored Relayer (`relayer/test/relayer.test.mjs`):** 2/2 PASS.
- **Playwright Browser E2E (`apps/web/e2e.mjs`):** Chromium PASS + Firefox PASS (`0` console/page errors).
