# Veil Protocol — Core Performance & GPAS Resource-Safety Review

**Branch:** `optimization/core-performance`  
**Pinned Gno Toolchain:** `gnolang/gno` `v1.8.0-rc.1` (`fc79041f4cd1a7b3ed4b316dc5ac14162eb78730`)  
**Date:** November 26, 2026

---

## 1. Executive Recommendation

**Recommendation: RETAIN the frozen `groth16/v2` Core for V1.**

1. **Modest 1-input gain:** Experimental optimizations reduced 1-input net gas from **`2,888,411`** to **`2,775,336`** (**`-113,075` gas / `-3.9%`**), which does not reach the aspirational `2.23M` net target because native `crypto/bn254` precompile gas (`PairingCheck` + `G1Mul` + `G1Add`) dominates single-input verification in GnoVM `v1.8.0-rc.1`.
2. **Release discipline:** `groth16/v2` is already submitted to `onyx-1` (Height `1426060`) and queued in GPAS. Resubmitting Core while GPAS activation is unresolved would add queue churn without unlocking Onyx.
3. **Preserve scalar-alias regression test:** `TestScalarAliasInputPlusRRejected` (`input + r` and `r + 1`) is retained in `hardening_test.gno`.

---

## 2. Benchmark Comparison (Identical Harness & Pinned `v1.8.0-rc.1`)

Baseline (`main`, `groth16/v2`) vs. Experimental (`optimization/core-performance`), measured via `gno test -v -root-dir E:\toolchains\gno ./gno/...`:

| Benchmark | Baseline Total Gas | Baseline Net Gas (`- 349,770`) | Experimental Total Gas | Experimental Net Gas (`- 349,770`) | Delta |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `TestGasBench_0_NoOp` | `349,770` | `0` | `349,770` | `0` | `0` |
| `TestGasBench_1_Verify1Input` | `3,238,181` | `2,888,411` | `3,125,106` | `2,775,336` | **`-113,075` (`-3.9%`)** |
| `TestGasBench_2_Verify2Inputs` | `3,379,544` | `3,029,774` | `3,287,698` | `2,937,928` | **`-91,846` (`-3.0%`)** |
| `TestGasBench_3_Verify4Inputs` (zero-padded) | `3,670,766` | `3,320,996` | `3,341,775` | `2,992,005` | **`-328,991` (`-9.9%`)** |
| `TestGasBench_4_Verify8Inputs` (zero-padded) | `4,247,514` | `3,897,744` | `3,630,635` | `3,280,865` | **`-616,879` (`-15.8%`)** |
| `TestGasBench_5_VerifyPrepared1Input` (incl. `Prepare`) | — | — | `3,241,418` | `2,891,648` | Opt-in immutable VK API |
| `TestGasBench_6_NonZero16_32_64Inputs` (16+32+64 non-zero) | — | — | `34,121,554` | `33,771,784` | Verified up to `MaxPublicInputs=64` |
| `TestAdversarialVotingSuite` (Semaphore v4 depth-10) | `90,568,522` | — | `89,174,554` | — | **`-1,393,968`** |

---

## 3. Source Changes on `optimization/core-performance`

- **`gno/p/groth16/groth16.gno`:**
  1. **Zero-allocation stack buffers:** Replaced per-iteration `mulBuf`/`addBuf` and `negateG1` + `subBE32` + `append` heap allocations with stack-allocated `[128]byte` MSM buffer (`msmBuf`), `[64]byte` `vkX`, and `[768]byte` `pairingInput` via `negateG1Into` / `subBE32Into`.
  2. **MSM identity/unit shortcuts:** Skip `G1Mul`+`G1Add` when `s == 0` (`isZero32`) and skip `G1Mul` when `s == 1` (`isOne32`).
  3. **Deferred `< p` coordinate classification:** Rely on native `crypto/bn254` (`gnark-crypto`) for `< p`, `IsOnCurve`, and `IsInSubGroup` on the hot path, running `validateG1Coords`/`validateG2Coords`/`validateVerifyingKey` only when `PairingCheck`/`G1Mul` rejects an input (preserving exact error types).
  4. **`PreparedVerifyingKey`:** Added `PrepareVerifyingKey` / `VerifyPrepared` for pre-validated immutable VKs with pre-negated `-Alpha`.
- **`gno/p/groth16/hardening_test.gno`:**
  - Added `TestScalarAliasInputPlusRRejected` (`input + r` and `r + 1`), `TestGasBench_5_VerifyPrepared1Input`, and `TestGasBench_6_NonZero16_32_64Inputs`.

---

## 4. Security Invariants & Scalar-Alias Implications

All V1 security invariants are preserved (`groth16` tests pass 100%):
- **Canonical scalar `< r` check (`validateScalar`) is NEVER skipped:** `crypto/bn254.G1Mul` silently reduces scalars `mod r`. Without `< r` validation, `input + r` (for `input < 2^256 - r`) would verify as a valid proof alias and bypass application-level nullifier uniqueness if raw public signals are stored as nullifiers/identifiers. `TestScalarAliasInputPlusRRejected` explicitly verifies `ErrNonCanonicalScalar` for `input + r` and `r + 1`.
- **G2 subgroup & curve checks, infinity handling, `MaxPublicInputs = 64`, and degenerate VK checks** all remain intact.

---

## 5. GPAS Resource-Safety Preflight Audit

| Package & Location | Finding | Recommended Bound (Post-V1 / Do Not Resubmit Frozen Onyx) |
| :--- | :--- | :--- |
| `gno/p/groth16/groth16.gno:28` | `MaxPublicInputs = 64` and `ProofSize = 256` already bounded | Already bounded |
| `gno/p/semaphore/semaphore.gno:208-228` | `AddMember` does not enforce `len(g.Members) < (1 << uint(g.Depth))` or `Depth <= 20` | Add `Depth <= 20` and capacity check `len(g.Members) < (1 << uint(g.Depth))` |
| `gno/r/veil_vote/veil_vote.gno:107, 242-270` | `CreatePoll` has no `len(title)` / `len(options)` cap; `GetGroupCommitments` / `GetPollCommitments` concatenate all members in one `strings.Builder` | Cap `len(title) <= 256`, `len(options) <= 32`; add paginated commitment getters (max 100/call) |
| `gno/r/veil_registry/veil_registry.gno:37-68, 100-112` | `RegisterVerifier` lacks string-length & `publicInputs <= 64` caps; `Render` loops `1..nextID` | Cap `pkgPath <= 256`, `vkFingerprint <= 128`, `metadata <= 512`, `version <= 32`, `publicInputs <= 64`; paginate `Render` |
