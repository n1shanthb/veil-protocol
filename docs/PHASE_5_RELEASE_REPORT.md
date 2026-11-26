# Veil Protocol — Phase 5 Release Candidate Report

**Date:** November 26, 2026  
**Directive:** Engineering Directive 006 (Phase 5 Release-Candidate Preparation)  
**Pinned Gno Toolchain:** `gnolang/gno` `v1.8.0-rc.1` (`fc79041f4cd1a7b3ed4b316dc5ac14162eb78730`)  
**Deployer Address:** `g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04`

---

## Executive Verdicts

| Environment | Verdict | Summary |
| :--- | :--- | :--- |
| **Local Stack (`gnoland` + Relayer + SDK + Studio)** | **GO** | All 9 Gno packages, 6 SDK suites, 2 Relayer suites, local `gnoland` `v2` deployment, `local_e2e_relay.js`, and Chromium + Firefox Playwright E2E suites pass with 0 errors. |
| **Public Demo Hosting (Static Web + Relayer)** | **READY FOR HOSTING** | `apps/web` Vite production bundle builds cleanly; hardened `relayer/server.js` supports restricted CORS (`VEIL_ALLOWED_ORIGINS`), atomic JSON persistence, `/ready`, and bounded rate limiting; documented in `docs/HOSTING.md`. |
| **Onyx Public Testnet (`onyx-1`)** | **NO-GO (Pending GPAS)** | `groth16/v2`, `semaphore/v2`, and `veil_vote/v2` remain in GPAS `review` (`in review queue`) on `https://gpas.latest.testnets.gno.land`. Additionally, `veil_vote/v2` was submitted before the `HIGH-2` audit fix (`SnapshotMemberCount` / `GetPollCommitments`), so a `v3` submission will be required once `groth16/v2` and `semaphore/v2` activate. |

---

## A. Release Source Integrity & Manifest

All release-candidate source checksums, dependency mappings, Onyx submission transactions, and Semaphore `4.13.0` ceremony artifacts are recorded in [`docs/RELEASE_MANIFEST.json`](./RELEASE_MANIFEST.json) (`veil-phase5-rc1`).

### Onyx `v2` Submission vs. Local RC Source Comparison

| Package Path | Onyx Height | Onyx TxHash | GPAS Status | Matches Current Local Source? |
| :--- | :--- | :--- | :--- | :--- |
| `.../groth16/v2` | `1426060` | `U61xv6bC85z9VopmocG5DV7iumLhEOEtCLC8TEESZPU=` | `review` | **Yes** (unchanged since Phase 3) |
| `.../semaphore/v2` | `1426645` | `yhsY8yPnhZMsWQXr2sDO1GHuLxQr/XzZi9KLr8KZ9ME=` | `review` | **Yes** (`gnomod.toml` bumped to `v2`) |
| `.../veil_vote/v2` | `1426647` | `e2LV8InVSEcbDamHF3eZFYO7icsuDbeIThy4w+j/TTw=` | `review` | **No** — Onyx `v2` was submitted *before* the `HIGH-2` fix (`SnapshotMemberCount` and `GetPollCommitments`) was added to `gno/r/veil_vote/veil_vote.gno`. |
| `.../veil_registry/v1` | — | — | `not_submitted` | Local RC only (added in Phase 5 Section G). |

> **Honesty Note:** Earlier `v1` submissions (`semaphore/v1`, `veil_vote/v1`) and Phase 0 `groth16` are obsolete and not part of `veil-phase5-rc1`. No Onyx package has been activated by GPAS yet, so no on-chain execution claims are made for Onyx.

---

## B. Onyx Activation & Support Request

- Queried `https://gpas.latest.testnets.gno.land/api/packages?path=...` for `groth16/v2`, `semaphore/v2`, and `veil_vote/v2`; all three report `"status": "review"`, `"line": "in review queue"`.
- Prepared [`docs/ONYX_SUPPORT_REQUEST.md`](./ONYX_SUPPORT_REQUEST.md) with exact package paths, dependency order, transaction hashes, block heights, Gno toolchain version, and local verification evidence for escalation to the Gno.land team.

---

## C. Independent Adversarial Audit & Remediations

An independent read-only security auditor (`research` subagent) inspected `groth16.gno`, `semaphore.gno`, `veil_vote.gno`, `sdk/src/index.ts`, `relayer/server.js`, and `apps/web/src/veil-browser.ts` and reported 4 High, 6 Medium, and 2 Low findings.

### Resolution Matrix

| ID | Component | Finding | Status & Action Taken |
| :--- | :--- | :--- | :--- |
| **HIGH-1** | `groth16.gno` | EIP-196/197 `ParseG1`/`ParseG2` reliance on `bn254` stdlib checks | **Verified / Documented:** Confirmed `bn254.go` (`E:\toolchains\gno\gnovm\stdlibs\crypto\bn254\bn254.go`) enforces `IsOnCurve()`, field range, and `IsInSubGroup()` in `parseG2`, and `G1Mul` reduces scalars mod `r`. Covered by `hardening_test.gno`. |
| **HIGH-2** | `veil_vote.gno` | `CreatePoll` snapshot lacked `SnapshotMemberCount` and `GetPollCommitments` export for voters to reconstruct the exact snapshot Merkle tree | **Fixed:** Added `SnapshotMemberCount int` to `Poll` and exported `GetPollCommitments(pollID uint64) string` in `gno/r/veil_vote/veil_vote.gno`. Verified in `veil_vote_test.gno`. |
| **HIGH-3** | `relayer/server.js` | `inFlight` key used `nullifier` alone (allowing DoS/lockout if paired with invalid proof) and non-atomic `writeFileSync` for `stateFile` | **Fixed:** Keyed `inFlight` by `sha256(rawBody)` and implemented atomic `persistState()` via temp-file write + `renameSync`. |
| **HIGH-4** | `relayer/server.js` | Synchronous `execFileSync` blocked Node event loop during `gnokey` broadcasts | **Fixed:** Replaced with async `execFile` (`execFileAsync`) with timeout handling. |
| **MEDIUM-1** | `semaphore.gno` | `VerifyMembership` accepts caller-supplied `root` | **By Design:** `semaphore.gno` is a stateless primitive; `veil_vote.gno` binds `poll.SnapshotRoot` and `poll.Scope` before calling `semaphore.VerifyMembership`. |
| **MEDIUM-2** | `relayer/server.js` | `loadState` silently ignored corrupt JSON state files | **Fixed:** `loadState()` now fails closed (`throw`) on corrupt JSON state files instead of resetting nullifiers. |
| **MEDIUM-3** | `relayer/server.js` | Unbounded `rateBuckets` map and wildcard CORS `*` | **Fixed:** Added bounded `rateBuckets` cleanup/cap and configurable `VEIL_ALLOWED_ORIGINS` CORS allowlist (plus `/ready` readiness probe). |
| **MEDIUM-4** | `relayer/server.js` | Missing readiness check separating liveness from `gnokey`/RPC readiness | **Fixed:** Added `GET /ready` endpoint verifying relayer state and configuration. |
| **MEDIUM-5** | `sdk/src/index.ts`, `veil-browser.ts` | Permissive `BigInt(...)` parsing accepted hex/whitespace/signs in decimal field inputs | **Fixed:** Added strict `parseFieldDecimal()` enforcing `/^(0|[1-9][0-9]*)$/` in both SDK and browser bundle. |
| **MEDIUM-6** | `apps/web` | Client-side prover downloads WASM/zkey from local static assets without SRI | **Documented:** Self-hosted static bundle integrity is covered in `docs/HOSTING.md`; exact SHA-256 hashes of `semaphore-10.wasm` and `semaphore-10.zkey` are pinned in `RELEASE_MANIFEST.json`. |
| **LOW-1 / LOW-2** | `groth16.gno` / `veil_vote.gno` | Minor gas/ergonomic notes (constant VK IC length checks, poll pagination) | **Accepted for RC:** No security impact; tracked for post-v1 optimization. |

---

## D. Clean-Machine Reproducibility & CI

- Updated [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) to build pinned `gnolang/gno` `v1.8.0-rc.1`, verify `vk_depth10.json` SHA-256, run `gno test -v -root-dir ... ./gno/... ./examples/...` (including `gno/r/veil_registry`), run a Veil Forge CLI smoke test (`inspect` + `generate` + `test`), build/test `sdk`, test `relayer`, and build `apps/web`.
- **Honesty Note:** This local workspace is not initialized as a git repository and has not been pushed to GitHub Actions; all CI steps were verified locally on Windows:
  - `gno test -v -root-dir E:\toolchains\gno ./gno/... ./examples/...` — **9/9 packages passed** (`groth16`, `semaphore`, `veil_verifier`, `veil_vote`, `veil_registry`, and 4 Forge examples).
  - `sdk`: `tsc` build + `node --test ./test/sdk.test.mjs` — **6/6 passed**.
  - `relayer`: `node --test ./relayer/test/relayer.test.mjs` — **2/2 passed**.
  - `apps/web`: `npm run build` (`vite build`) — **passed**.

---

## E. Veil Studio & End-to-End Verification

- **Proof Playground:** Added real browser-side `snarkjs.groth16.verify` verification in `apps/web/src/veil-browser.ts` and `apps/web/src/main.ts` so tampered proofs/public inputs are rejected in-browser before submission.
- **Veil Forge UI:** Added deployable bundle export (`verifier.gno`, `verifier_test.gno`, `gnomod.toml`) alongside live Gno code generation.
- **Local `gnoland` (`chainid=dev`) `v2` Verification:**
  - `groth16/v2`: Height `5`, Tx `tacunCZ7GP8BQRDr0YCkYhgNoCyWOgwagfup8FfA6B8=`
  - `semaphore/v2`: Height `203`, Tx `dDPJ4/AW1ecvQPERz9VEhc7mhrJtel7JbFcUwsO4LJs=`
  - `veil_vote/v2`: Height `204`, Tx `H2l9mO1VVbLnlao8bNdqKtKeWtu4RsjoQ5sfDkB3muU=`
  - `node scripts/local_e2e_relay.js`: Relayed Vote Tx `ppDPxiJyq7I5K9Pj1hVz9nhaFOjDER6Gc4EoloNoAvw=` (`gasUsed: 16667467`, `height: 216`); Poll #42 tally incremented to `1`; duplicate vote rejected on-chain with `semaphore: nullifier already used in scope`.
  - **Playwright E2E (`apps/web/e2e.mjs`):**
    - **Chromium:** Relayed Vote Tx `TmJNqsl3nMaUpoPD+lqD/Z7t9rNzfszRxCG4YaleVno=` (`gasUsed: 16712669`, `height: 218`), `2339ms` client proof, **0 console/page errors**.
    - **Firefox:** Local vote + duplicate rejection + Forge + Proof Playground valid/tampered `snarkjs` verify + Circuit Library/Deployments/Primitives tabs, `3127ms` client proof, **0 console/page errors**.

---

## F. Public Hosting Preparation

- Documented static frontend + hardened relayer deployment topology, environment variables (`VEIL_ALLOWED_ORIGINS`, `VEIL_VOTE_REALM`, `VEIL_RPC_URL`), and `/ready` healthcheck configuration in [`docs/HOSTING.md`](./HOSTING.md).

---

## G. Veil Verifier Registry (`gno/r/veil_registry`)

- Implemented `gno/r/veil_registry/veil_registry.gno` and `veil_registry_test.gno` (`gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/veil_registry/v1`) and added `./gno/r/veil_registry` to `gnowork.toml`.
- Provides on-chain registration, lookup, and ownership-gated deprecation of Groth16 verification keys and circuit metadata, verified by `gno test`.

---

## H. Timed Developer Adoption Journey

Measured end-to-end CLI workflow on `circuits/build/cubic_check` (`verification_key.json`, `proof.json`, `public.json`):
1. `node cli/veil.js inspect circuits/build/cubic_check/verification_key.json`
2. `node cli/veil.js generate ... --pkgpath gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/cubic_journey --core gno.land/p/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/groth16/v2`
3. `node cli/veil.js test --dir ... --proof ... --public ...` (`TestVeilCLIProof` `8,014,927` gas, `TestGeneratedVKInitialized` `354,932` gas)

- **Total Measured Elapsed Time:** **`1.79s`**
