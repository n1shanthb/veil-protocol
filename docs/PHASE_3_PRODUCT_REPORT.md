# Veil Protocol — Phase 3 Product Engineering Report

**Date:** November 26, 2026  
**Local Readiness Verdict:** **GO** (All Core, Primitives, Vote Realm, TypeScript SDK, Forge CLI, Relayer, Web Platform, and 3rd-party circuit integration tests pass locally).  
**Onyx Testnet Readiness Verdict:** **CONDITIONAL GO** (Hardened versioned packages `groth16/v2`, `semaphore/v1`, and `veil_vote/v1` are committed on `onyx-1` and entered GPAS review independently, awaiting `MsgEnablePackage` activation).

---

## 1. Track A — Release Engineering & Onyx (`onyx-1`)

Versioned hardened packages were deployed in dependency order to `onyx-1` (`v1.8.0-rc.1`) and confirmed in GPAS (`https://gpas.latest.testnets.gno.land`) independently of the obsolete Phase 0 packages (see [RELEASE_MANIFEST.json](file:///e:/Veil%20ZK%20protocol/docs/RELEASE_MANIFEST.json)):

| Package | Height | Tx Hash | Gas Used | GPAS Status |
| --- | --- | --- | --- | --- |
| `.../groth16/v2` | `1426060` | `U61xv6bC85z9VopmocG5DV7iumLhEOEtCLC8TEESZPU=` | `59,348,160` | `review` |
| `.../semaphore/v1` | `1426062` | `mxqRc626QF0xkVDz4wq7lPdBqO7W4C21EHvy1znI4Uc=` | `23,547,033` | `review` |
| `.../veil_vote/v1` | `1426064` | `VtbiZcm4THMczuVCQ0KRuevbXQgAsod5cNOh0zPLaXo=` | `29,954,182` | `review` |

Live `MsgCall` proof execution on `onyx-1` remains blocked until GPAS enables these packages via `MsgEnablePackage`.

---

## 2. Track B — Phase 2 Security Closure & Poseidon Benchmark

- **VK Registry Immutability & Root Versioning:** [semaphore.gno](file:///e:/Veil%20ZK%20protocol/gno/p/semaphore/semaphore.gno) enforces `ErrVKAlreadyRegistered` on duplicate depth registration, tracks `Group.RootVersion`, and provides `DomainScopeFull(network, appDomain, groupID, pollID)`.
- **Poseidon(2) Feasibility Benchmark ([poseidon_bench_test.gno](file:///e:/Veil%20ZK%20protocol/gno/p/semaphore/poseidon_bench_test.gno)):**
  - `TestPoseidon2GasBenchmark_0_Baseline`: `350,520` gas
  - `TestPoseidon2GasBenchmark_1_SingleHash` (pure-Gno `[4]uint64` 65-round Poseidon(2)): **`1,780,642,569` net gas** (`1.05s`).
  - Even with Montgomery optimization (~5–10x), a depth-10 LeanIMT insertion (10 hashes) would consume ~1.8B–3.5B gas, confirming that V1 must retain the **authorized root publisher** model until Gno adds a native `crypto/poseidon` precompile.
- **Upstream Semaphore v4.13.0 Artifact Provenance:**
  - `vk_depth10.json` SHA-256: `a6789bea2b941dbdb86e887cc9f958aa447dcbfa9ff725a886d99db2c2c47c3b`
  - `semaphore-10.wasm` (`1,815,560` bytes) SHA-256: `1e9e1e3ad9917164bc96c751e32fae724400b92063f5a2cfd22ca64674bf4f96`
  - `semaphore-10.zkey` (`2,422,238` bytes) SHA-256: `f644af6753be9d48454d8f9bb74bf2e9a416dd7d1a704c3cf1d50e535969a19a`

---

## 3. Track C — Veil TypeScript SDK (`sdk/`)

Implemented [@veil-protocol/sdk](file:///e:/Veil%20ZK%20protocol/sdk/src/index.ts) with typed `VeilError`s, `validateAndConvertVK`, `validateAndConvertProof`, `encodePublicInputs`, `semaphoreHashToField`, `generateSemaphoreVoteProof`, `buildVerifyCallArgs`, `buildVoteCallArgs`, and `queryRealmRender`.
- `npm run build` (`tsc`) and `node --test ./test/sdk.test.mjs`: **3/3 tests PASS**.

---

## 4. Track D & F — Veil Web Platform (`apps/web/`)

Built the Obsidian/Graphite/Platinum web platform ([apps/web/src/main.ts](file:///e:/Veil%20ZK%20protocol/apps/web/src/main.ts)) combining:
- **Veil Vote:** Local identity create/restore, local LeanIMT root reconstruction, client-side Semaphore v4 proof generation, local dev simulation vs Onyx `gnokey` / Relayer submission, and Admin panel (commitment registration, poll creation).
- **Veil Studio:** Circuit Library, Forge (VK -> Gno `verifier.gno`), Proof Playground (canonical encoder + call builder), Deployments (real Onyx tx evidence), and Primitives docs.
- `npm run build` (`vite build`): **PASS** (`3.90s`, `dist/assets/index-BIc9JtGD.js` `477.16 kB`).

---

## 5. Track E — Sponsored Transaction Relayer (`relayer/`)

Implemented [relayer/server.js](file:///e:/Veil%20ZK%20protocol/relayer/server.js) accepting public proof artifacts only (`secret`/`witness` fields rejected), enforcing `32KB` body cap, `Vote`/`Verify`/`VerifyProof` allowlist, rate limits, daily fee budget, and `(pollId, nullifierHex)` idempotency.
- `node --test ./relayer/test/relayer.test.mjs`: **2/2 tests PASS**.
- **Limitations:** Relayer observes caller IP and timing metadata, can censor/drop requests (mitigated by direct wallet/CLI fallback), and never validates proof truth independently of on-chain GnoVM verification.

---

## 6. Track G — Developer Adoption & Third-Party Circuit Proof

- Created [QUICKSTART.md](file:///e:/Veil%20ZK%20protocol/docs/QUICKSTART.md) and external third-party circuit [cubic_check.circom](file:///e:/Veil%20ZK%20protocol/circuits/external/cubic_check.circom) (`x^3 + x + 5 == out`), compiled, proven, generated into [examples/cubic_check_verifier](file:///e:/Veil%20ZK%20protocol/examples/cubic_check_verifier/verifier.gno) via `veil generate`, and verified inside GnoVM via `veil test`.
