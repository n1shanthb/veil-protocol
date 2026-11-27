# Veil Protocol — AI-Assisted Adversarial Security Review Report

**Reviewer:** AI-Assisted Adversarial Security Review (`research` subagent `94d9bbe2-93f6-491b-8ddf-a1343e9fc982`)  
**Scope:** `gno/p/groth16/`, `gno/p/semaphore/`, `gno/r/veil_vote/`, `sdk/`, `relayer/`, `apps/web/`, `cli/`, `.github/workflows/ci.yml`  
**Audit Date:** November 26, 2026

---

## Summary

The independent auditor identified **4 High**, **6 Medium**, **2 Low**, and **1 Informational** findings. All code-level High, Medium, and Low issues in the V1 scope have been remediated with regression tests or documented with explicit operational controls.

---

## Findings & Final Disposition

### [HIGH-1] Trusted Root Publisher Can Forge Arbitrary Merkle Roots (No On-Chain Commitment-to-Root Binding)
- **Severity:** High (Trust Assumption)
- **Source References:** `gno/p/semaphore/semaphore.gno:161-171, 208-248` (`AddMember`, `PublishRoot`); `gno/r/veil_vote/veil_vote.gno:82-103`
- **Exploit / Reproduction:** `AddMember` appends commitments to `g.Members`, while `PublishRoot` accepts any non-zero 32-byte scalar `< r` from `g.RootPublisher` or `g.Admin` without verifying on-chain that the root equals the LeanIMT of `g.Members`. A compromised `RootPublisher` or `Admin` could publish a root containing non-member commitments or omitting legitimate members.
- **Remediation:** Added `TransferAdmin` and `.IsValid()` address validation in `veil_vote/v3` so `Admin` can be rotated to a multi-sig or DAO governance address. Documented the trusted `RootPublisher` assumption explicitly in `docs/SECURITY_AND_PRIVACY.md` and `veil_vote.gno` package docstring. Full on-chain Poseidon/LeanIMT root computation is deferred beyond V1 (`1,780,981,550` gas per single Poseidon2 hash in interpreted GnoVM).
- **Regression Test:** `TestAdversarialVotingSuite` (`gno/r/veil_vote/veil_vote_test.gno`) tests `TransferAdmin`, old-admin rejection, and invalid address rejection.
- **Final Disposition:** **Mitigated / Documented (V1 Trust Model)**

### [HIGH-2] Missing Historical Membership Data Availability for Frozen Poll Snapshots
- **Severity:** High
- **Source References:** `gno/p/semaphore/semaphore.gno:161-171, 231-248`; `gno/r/veil_vote/veil_vote.gno:20-32, 106-142, 225-238`
- **Exploit / Reproduction:** `CreatePoll` froze `SnapshotRoot` and `SnapshotVersion`, but `Poll` did not record `SnapshotMemberCount`. `GetGroupCommitments(groupID)` always returned the full current `g.Members` slice, preventing voters from reconstructing an earlier poll's exact Merkle tree once new members were added.
- **Remediation:** Added `SnapshotMemberCount int` to `Poll` and exported `GetPollCommitments(pollID uint64) string` in `gno/r/veil_vote/veil_vote.gno` returning `g.Members[:p.SnapshotMemberCount]`.
- **Regression Test:** `TestAdversarialVotingSuite` (`gno/r/veil_vote/veil_vote_test.gno`) verifies `GetPollCommitments` returns the frozen snapshot prefix.
- **Final Disposition:** **Resolved (`veil_vote/v3`)**

### [HIGH-3] Relayer Synchronous `execFileSync` Blocks Event Loop (Unauthenticated DoS)
- **Severity:** High
- **Source References:** `relayer/server.js:184-188` (`relayVoteViaGnokey`), `248-252`, `293-310`
- **Exploit / Reproduction:** Every `POST /api/relay/vote` (including `simulateOnly: true`) invoked synchronous `execFileSync` with a 15s timeout, freezing the Node.js event loop and blocking `/health` and all concurrent requests.
- **Remediation:** Replaced `execFileSync` with asynchronous `execFile` (`execFileAsync`) with bounded timeout handling.
- **Regression Test:** `relayer/test/relayer.test.mjs` (`concurrent duplicates, failed tx retry, persistent budget & restart recovery`).
- **Final Disposition:** **Resolved**

### [HIGH-4] Relayer Crash-Recovery Gap & Non-Atomic State Persistence Enable Budget Bypass
- **Severity:** High
- **Source References:** `relayer/server.js:41-66` (`loadOrInitState`), `68-79` (`persistState`), `303-308`
- **Exploit / Reproduction:** `persistState` used non-atomic `fs.writeFileSync`, and `loadOrInitState` silently caught JSON parse errors and reset `spentUgnotToday = 0` and `idempotency = {}`.
- **Remediation:** Implemented atomic `persistState()` via temp-file write + `fs.renameSync` and fail-closed `loadOrInitState()` that throws on corrupt JSON state files instead of resetting budget/idempotency.
- **Regression Test:** `relayer/test/relayer.test.mjs` tests persistent budget & restart recovery.
- **Final Disposition:** **Resolved**

### [MEDIUM-1] Default Realm Version Mismatch (`veil_vote/v1` vs `v2/v3`) Breaks Relayer Scope Verification
- **Severity:** Medium
- **Source References:** `relayer/server.js:31` vs `gno/r/veil_vote/gnomod.toml:1`, `sdk/src/index.ts`, `apps/web/src/veil-browser.ts`
- **Exploit / Reproduction:** Mismatched default realm versions caused `DomainScopeFull` scope mismatch (`veil_vote.gno` binds `cur.PkgPath()`).
- **Remediation:** Standardized all defaults across `gnomod.toml`, `relayer/server.js`, `sdk/src/index.ts`, `apps/web/src/veil-browser.ts`, `scripts/gen_vote_tests.js`, and `scripts/local_e2e_relay.js` to `gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/veil_vote/v3`.
- **Regression Test:** `scripts/local_e2e_relay.js` + `apps/web/e2e.mjs` (Chromium & Firefox) against live `veil_vote/v3`.
- **Final Disposition:** **Resolved**

### [MEDIUM-2] Wildcard CORS (`*`) Allows Cross-Origin Relayer Budget Drain
- **Severity:** Medium
- **Source References:** `relayer/server.js` CORS headers
- **Exploit / Reproduction:** Arbitrary websites could `POST http://127.0.0.1:8787/api/relay/vote` from a user's browser to drain the relayer's daily `ugnot` budget.
- **Remediation:** Restricted CORS to configurable `VEIL_ALLOWED_ORIGINS` allowlist (defaulting to local dev origins) instead of wildcard `*`.
- **Regression Test:** Verified in `relayer/test/relayer.test.mjs` and `apps/web/e2e.mjs`.
- **Final Disposition:** **Resolved**

### [MEDIUM-3] Relayer Unbounded In-Memory `rateBuckets` and `idempotency` Maps
- **Severity:** Medium
- **Source References:** `relayer/server.js:47-50, 90-96, 306`
- **Exploit / Reproduction:** Unbounded map growth under IP rotation or multi-day operation could exhaust memory.
- **Remediation:** Added periodic sweep / max-entries cap on `rateBuckets` and retention pruning.
- **Regression Test:** `relayer/test/relayer.test.mjs`.
- **Final Disposition:** **Resolved**

### [MEDIUM-4] Unauthenticated `inFlight` Lock Enables 15s Vote-Submission DoS
- **Severity:** Medium
- **Source References:** `relayer/server.js:281-291`
- **Exploit / Reproduction:** Keying `inFlight` solely by `${pollId}:${nullifierHex}` allowed an attacker observing a nullifier to lock it for 15s with an invalid proof.
- **Remediation:** Keyed `inFlight` by `sha256(rawBody)` so invalid payloads cannot lock out valid submissions for the same nullifier.
- **Regression Test:** `relayer/test/relayer.test.mjs` (`concurrent duplicates`).
- **Final Disposition:** **Resolved**

### [MEDIUM-5] Empty/Whitespace Strings Silently Coerced to `0` in JS Field Parsers
- **Severity:** Medium
- **Source References:** `sdk/src/index.ts:72-90`; `apps/web/src/veil-browser.ts:17-23`; `cli/veil.js:29-43`
- **Exploit / Reproduction:** `BigInt("")`, `BigInt("   ")`, and `BigInt("0x10")` were accepted instead of throwing `NON_CANONICAL_FIELD`.
- **Remediation:** Enforced strict `/^(0|[1-9][0-9]*)$/` canonical decimal validation in `sdk/src/index.ts`, `apps/web/src/veil-browser.ts`, and `cli/veil.js`.
- **Regression Test:** `sdk/test/sdk.test.mjs` (`validateAndConvertVK` and `encodePublicInputs` negative/noncanonical tests).
- **Final Disposition:** **Resolved**

### [MEDIUM-6] Remote ZK Artifact Fetching Without Local Integrity / SRI Pinning
- **Severity:** Medium
- **Source References:** `sdk/src/index.ts:255-261`; `apps/web/src/main.ts:478`
- **Exploit / Reproduction:** Default `@semaphore-protocol/proof` artifact fetch relies on remote CDN unless local paths or self-hosted URLs are provided.
- **Remediation:** Pinned exact SHA-256 checksums of `vk_depth10.json`, `semaphore-10.wasm`, and `semaphore-10.zkey` in `docs/RELEASE_MANIFEST.json` and `.github/workflows/ci.yml`, and documented self-hosting + integrity verification in `docs/HOSTING.md` and `docs/SECURITY_AND_PRIVACY.md`.
- **Regression Test:** `.github/workflows/ci.yml` SHA-256 verification step.
- **Final Disposition:** **Mitigated / Documented**

### [LOW-1] Browser UI Exposes Deterministic Test Secrets & Loses Ephemeral Identity Seed
- **Severity:** Low
- **Source References:** `apps/web/src/main.ts:29-33, 41-42, 147, 438-446`
- **Exploit / Reproduction:** Demo UI initializes with deterministic dev preset `"veil-phase2-member-0"` for instant local testing.
- **Remediation:** Documented in `docs/SECURITY_AND_PRIVACY.md` that the Studio identity preset is strictly for local developer testing; production deployments must generate fresh random `Identity()` instances.
- **Final Disposition:** **Accepted / Documented (Developer Preview UI)**

### [LOW-2] `VKRegistry.Register` Skips VK Point Validation; `veil_vote` Admin Is Non-Rotatable
- **Severity:** Low
- **Source References:** `gno/p/semaphore/semaphore.gno:138-150`; `gno/r/veil_vote/veil_vote.gno:35, 71-142`
- **Exploit / Reproduction:** `veil_vote` hardcoded `admin` without `TransferAdmin`, and `CreateGroup` did not call `rootPublisher.IsValid()`.
- **Remediation:** Added `TransferAdmin` and `rootPublisher.IsValid()` checks in `gno/r/veil_vote/veil_vote.gno` (`veil_vote/v3`). `VKRegistry.Register` remains unchanged in `semaphore/v2` (non-empty `vk10` is validated at `veil_vote` `init()` via `groth16.ParseVerifyingKeyHex`).
- **Regression Test:** `TestAdversarialVotingSuite` (`gno/r/veil_vote/veil_vote_test.gno`).
- **Final Disposition:** **Resolved in `veil_vote/v3` (VKRegistry check accepted for V1)**

### [INFO] `groth16.gno` Cryptographic & Point-Handling Assessment
- **Severity:** Informational
- **Source References:** `gno/p/groth16/groth16.gno:78-161, 272-361`; `gno/r/veil_vote/veil_vote.gno:49-60`
- **Summary:** Base-field (`< p`) and scalar-field (`< r`) bounds, `MaxPublicInputs = 64`, `Alpha`/`Beta`/`Gamma`/`Delta` non-zero checks, `negateG1` infinity handling, and `bn254.PairingCheck` equation `e(A,B)*e(-Alpha,Beta)*e(-vkX,Gamma)*e(-C,Delta) == 1` are verified sound. `vk10` in `veil_vote.gno` matches `circuits/semaphore/vk_depth10.json` byte-for-byte.
