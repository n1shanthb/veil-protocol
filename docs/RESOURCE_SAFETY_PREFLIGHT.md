# Veil Protocol — Resource-Safety Preflight & Benchmark Report

**Branch:** `hardening/resource-safety`  
**Pinned Gno Toolchain:** `gnolang/gno` `v1.8.0-rc.1` (`fc79041f4cd1a7b3ed4b316dc5ac14162eb78730`)  
**Date:** November 26, 2026

---

## 1. Benchmark Methodology & Frozen Core Verdict

- **Frozen Core (`groth16/v2` on `main`) vs. Experimental (`optimization/core-performance`):**
  - Identical pinned `v1.8.0-rc.1` runtime, identical fixtures, identical `TestGasBench_0_NoOp` (`349,770` gas baseline).
  - **1-input (`TestGasBench_1_Verify1Input`):** Frozen `3,238,181` (`2,888,411` net) vs. Experimental `3,125,106` (`2,775,336` net, `-3.9%`).
  - **2-input (`TestGasBench_2_Verify2Inputs`):** Frozen `3,379,544` (`3,029,774` net) vs. Experimental `3,287,698` (`2,937,928` net, `-3.0%`).
  - **Zero-padded 4/8-input (`TestGasBench_3/4`):** Experimental skips `G1Mul`+`G1Add` for zero scalars (`2,992,005` / `3,280,865` net), whereas fully populated non-zero `16+32+64` inputs (`TestGasBench_6_NonZero16_32_64Inputs`) require `34,121,554` total gas.
  - **Decision:** **Retain frozen `groth16/v2` for V1.** Native `crypto/bn254` precompile gas (`PairingCheck` + `G1Mul` + `G1Add`) accounts for the majority of single-input cost in `v1.8.0-rc.1`; we did not copy any unlicensed external verifier code.

---

## 2. Explicit Resource Limits & Rationale

All bounds are enforced **before** hex decoding, `strings.Split`, or state allocation.

### A. Semaphore Primitives (`gno/p/semaphore/v2`) — Enforced at `veil_vote/v3` Realm Boundary
Because `semaphore/v2` is already submitted to Onyx (`Tx: yhsY8yPnhZMsWQXr2sDO1GHuLxQr/XzZi9KLr8KZ9ME=`, `review` queue), its source was **not** modified. Instead, `veil_vote/v3` enforces all capacity limits at the realm boundary before calling `semaphore/v2`:

| Limit | Value | Rationale | Source Reference |
| :--- | :--- | :--- | :--- |
| `SupportedDepth` | `10` | Only ceremony-backed VK in V1 (`vk_depth10.json`) | `gno/r/veil_vote/veil_vote.gno:23` |
| `MaxGroupMembers` | `1024` (`1 << 10`) | Exact LeanIMT capacity for depth-10 circuit | `gno/r/veil_vote/veil_vote.gno:25` |
| `MaxGroups` | `64` | Bounds persistent `GroupRegistry` map & slice growth | `gno/r/veil_vote/veil_vote.gno:26` |

*(Note: A future `semaphore/v3` package can move `MaxDepth = 20` and `1 << Depth` enforcement directly into `GroupRegistry.AddMember` for arbitrary realms.)*

### B. Vote Realm (`gno/r/veil_vote/v3`)

| Limit | Value | Rationale | Source Reference |
| :--- | :--- | :--- | :--- |
| `MaxPolls` | `256` | Bounds persistent `polls` map & `pollIDs` slice | `gno/r/veil_vote/veil_vote.gno:27` |
| `MaxTitleLen` | `256` bytes | Prevents oversized poll title storage/render | `gno/r/veil_vote/veil_vote.gno:28` |
| `MaxOptions` | `32` | Bounds `Options` / `Tallies` slices | `gno/r/veil_vote/veil_vote.gno:29` |
| `MaxOptionLen` | `64` bytes | Bounds individual option string length | `gno/r/veil_vote/veil_vote.gno:30` |
| `MaxOptionsCSVLen` | `2080` bytes | Checked before `strings.Split` | `gno/r/veil_vote/veil_vote.gno:31` |
| `MaxPageSize` | `100` | Bounds `GetGroupCommitmentsPaged`, `GetPollCommitmentsPaged`, `ListPollsPaged` | `gno/r/veil_vote/veil_vote.gno:32, 310-395` |
| Hex input bounds | `<= 66 / 130 / 258` | Checked in `AddMember` & `Vote` before `hex.DecodeString` | `gno/r/veil_vote/veil_vote.gno:105, 224` |

### C. Registry (`gno/r/veil_registry/v1`)

| Limit | Value | Rationale | Source Reference |
| :--- | :--- | :--- | :--- |
| `MaxPkgPathLen` | `256` bytes | Bounds package path storage | `gno/r/veil_registry/veil_registry.gno:30` |
| `MaxFingerprintLen` | `128` bytes | Bounds VK hash/fingerprint | `gno/r/veil_registry/veil_registry.gno:31` |
| `MaxMetadataLen` | `512` bytes | Bounds circuit description metadata | `gno/r/veil_registry/veil_registry.gno:32` |
| `MaxVersionLen` | `32` bytes | Bounds semantic version tag | `gno/r/veil_registry/veil_registry.gno:33` |
| `MaxPublicInputs` | `64` | Matches `groth16.MaxPublicInputs` | `gno/r/veil_registry/veil_registry.gno:34` |
| `MaxRecords` | `1024` | Bounds total persistent registry entries | `gno/r/veil_registry/veil_registry.gno:35` |
| `MaxPageSize` | `50` | Bounds `ListVerifiersPaged` & `Render` (latest 50) | `gno/r/veil_registry/veil_registry.gno:36, 124-165` |

---

## 3. Adversarial Resource Test Results & Worst-Case Gas

| Test Suite | Scope Covered | Measured Gas | Result |
| :--- | :--- | :---: | :---: |
| `veil_vote` `TestAdversarialVotingSuite` | Replay, wrong poll/group/root/depth/option, closed poll, `TransferAdmin`, `GetPollCommitments` | `91,020,257` | **PASS** |
| `veil_vote` `TestResourceLimitsAndPagination` | Unsupported depth, empty/257-char title, 32 vs 33 options, 65-char option, full **1024-member** group + 1025th rejection, 11-page snapshot reconstruction, invalid pagination (`-1`, `0`, `101`) | `1,707,625,284` | **PASS** |
| `veil_registry` `TestRegistryLifecycleAndAuthorization` | Max 256/128/512/32/64 bounds, max+1 rejections, duplicate path, unauthorized/double deprecation, pagination & `Render` | `5,462,949` | **PASS** |
| `sdk` Test 12 | Multi-page `fetchPaginatedPollCommitmentsAndVerifyRoot` + `SNAPSHOT_ROOT_MISMATCH` | — | **PASS** |

---

## 4. Package Versioning & Deployment Blockers

- **Unchanged Onyx-Submitted Packages:** `groth16/v2` (`1426060`) and `semaphore/v2` (`1426645`) remain untouched and in GPAS `review` (`in review queue`) on `onyx-1`.
- **Ready for Onyx Once Dependencies Activate:** `veil_vote/v3` and `veil_registry/v1` (with all resource-safety bounds above) have **not** been submitted to Onyx yet.
- **Verdicts:**
  - **Local Engineering & Resource Safety:** **GO** (all 9 Gno packages, 7 SDK tests, 2 Relayer tests, Playwright Chromium & Firefox E2E, and Linux CI verified).
  - **Live Onyx Execution:** **NO-GO (Blocked on GPAS)** — `groth16/v2` and `semaphore/v2` remain in GPAS `review` queue, and `rpc.staging.gno.land` is in `503` planned maintenance.
