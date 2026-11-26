# Veil Protocol — Phase 1 Engineering Report

**Date:** November 26, 2026  
**Status:** Tracks B, C, and D Complete; Track A Diagnosed (`in review queue` on GPAS — awaiting automated/organizer `MsgEnablePackage` on `onyx-1`).

---

## 1. Track A — Onyx Activation Diagnostics & Status

### GPAS Inspection (`https://gpas.latest.testnets.gno.land`)

- **GPAS Mode:** `automatic` ("Packages that pass the checks are enabled automatically. Last pass 2026-11-26T08:57:03Z.")
- **Observed Timelock Pattern:** Other packages in GPAS show a 1-hour delay between `passed` verdict and `enabling at` timestamp.
- **Package Status:**
  - `gno.land/p/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/groth16`:
    - Status: `review` (`in review queue`)
    - `first_seen`: `2026-11-26T08:51:04Z`
    - Block Height: `1422595` | Tx Hash: `Lzw58UhljTFqrBYQIsSZdFwhdUo8RaHfm0ky9SjVM6o=` | Gas Used: `31255371`
  - `gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/veil_verifier`:
    - Status: `review` (`in review queue`)
    - `first_seen`: `2026-11-26T08:51:04Z`
    - Block Height: `1422602` | Tx Hash: `N1Z0qlZmpyleq3g3hs95+ss/d9Gx+FRz3SmEiDelvBo=` | Gas Used: `10662864`
- **Root Cause:** Neither package was refused; both are valid `MsgAddPackage` submissions parked in `inert_pkg:<path>` waiting for GPAS automated review + `MsgEnablePackage` activation on `onyx-1`. Because `groth16` is still `in review queue`, `veil_verifier` (which imports `groth16`) cannot be activated until `groth16` is enabled first.
- **Live Proof Execution:** Blocked on `onyx-1` until GPAS enables both packages (`MsgCall` currently fails with `unexpected node with location .../veil_verifier:0:0`). No duplicate `addpkg` transactions were submitted.

### Technical Support Request (If Manual Activation Is Needed)

> **Subject:** Request to review/enable Veil ZK Groth16 packages on `onyx-1`  
> **Network:** `onyx-1` (`v1.8.0-rc.1`)  
> **Deployer:** `g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04`  
> **Packages (submitted in dependency order, currently `in review queue` on GPAS):**  
> 1. `gno.land/p/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/groth16` — Height `1422595`, Tx `Lzw58UhljTFqrBYQIsSZdFwhdUo8RaHfm0ky9SjVM6o=` (pure-Gno Groth16/BN254 verifier using `crypto/bn254`)  
> 2. `gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/veil_verifier` — Height `1422602`, Tx `N1Z0qlZmpyleq3g3hs95+ss/d9Gx+FRz3SmEiDelvBo=` (minimal verification realm)  
> **GPAS Diagnostic:** Both show `status: "review"`, `first_seen: "2026-11-26T08:51:04Z"` on `https://gpas.latest.testnets.gno.land`.

---

## 2. Track B — Hardened Veil Core

### Source Changes ([groth16.gno](file:///e:/Veil%20ZK%20protocol/gno/p/groth16/groth16.gno))

- Added `MaxPublicInputs = 64` and `ErrTooManyPublicInputs` resource bounds in `Verify`, `ParseVerifyingKeyHex`, and `ParsePublicInputsHex`.
- Added `ErrDegenerateVerifyingKey` and explicit non-zero validation for `vk.Alpha`, `vk.Beta`, `vk.Gamma`, and `vk.Delta`.
- Added `EncodeProofBytes` for canonical 256-byte (`A | B | C`) round-trip serialization.

### Security & Differential Test Results

- **Security & Hardening Suite ([hardening_test.gno](file:///e:/Veil%20ZK%20protocol/gno/p/groth16/hardening_test.gno)):**
  - `TestPointAtInfinityAndDegenerateVK`: PASS (`65622048` gas)
  - `TestResourceLimitsAndOversizedArtifacts`: PASS (`15305317` gas)
  - `TestCanonicalEncodingAndRoundTrip`: PASS (`4901770` gas)
- **Randomized Differential Testing ([differential_test.js](file:///e:/Veil%20ZK%20protocol/scripts/differential_test.js) -> [differential_test.gno](file:///e:/Veil%20ZK%20protocol/gno/p/groth16/differential_test.gno)):**
  - Generated 8 randomized witness/proof pairs (4 `multiplier`, 4 `sum_of_squares`), verified all 8 in `snarkjs@0.7.5`, and verified all 8 in GnoVM (`TestDifferentialSnarkjsFixtures`: PASS, `80654362` gas).

### Isolated Verifier Gas Benchmarks (Pre-Parsed Fixtures in `init()`)

| Benchmark | Total Test Gas | Net `groth16.Verify` Gas (minus `NoOp`) |
| --- | --- | --- |
| `TestGasBench_0_NoOp` (harness baseline) | `349,770` | `0` |
| `TestGasBench_1_Verify1Input` | `3,238,181` | **`2,888,411`** |
| `TestGasBench_2_Verify2Inputs` | `3,379,544` | **`3,029,774`** |
| `TestGasBench_3_Verify4Inputs` | `3,670,766` | **`3,320,996`** |
| `TestGasBench_4_Verify8Inputs` | `4,247,514` | **`3,897,744`** |

Marginal cost per additional public input (`G1Mul` + `G1Add`): **~141k–145k gas**.

---

## 3. Track C — Veil Forge CLI

Implemented [cli/veil.js](file:///e:/Veil%20ZK%20protocol/cli/veil.js) and [package.json](file:///e:/Veil%20ZK%20protocol/package.json) with zero external npm dependencies:

- `veil inspect <verification_key.json>` — Validates Groth16/BN254 VK structure, `nPublic`, and canonical `< p` coordinates.
- `veil generate <verification_key.json> --out <dir>` — Converts G2 to EIP-197 (`x_imag|x_real|y_imag|y_real`) and generates `gnomod.toml`, `verifier.gno` (importing Veil Core `groth16`), `verifier_test.gno`, and `DEPLOY.md`.
- `veil test --dir <dir> --proof <proof.json> --public <public.json>` — Validates proof/inputs (`< p`, `< r`) and runs `gno test` against the generated realm.
- `veil deploy` / `veil verify` — Wraps `gnokey maketx addpkg` and `gnokey maketx call` without hardcoded passwords.

### Two-Circuit Forge Verification

- Generated [examples/multiplier_verifier](file:///e:/Veil%20ZK%20protocol/examples/multiplier_verifier/verifier.gno) (1 public input): `veil test` PASS (`8,034,159` gas).
- Generated [examples/sum_of_squares_verifier](file:///e:/Veil%20ZK%20protocol/examples/sum_of_squares_verifier/verifier.gno) (2 public inputs): `veil test` PASS (`9,253,126` gas).
- Zero circuit-specific changes were required in Veil Core.

---

## 4. Track D — Semaphore v4 Compatibility

Completed [SEMAPHORE_COMPATIBILITY.md](file:///e:/Veil%20ZK%20protocol/docs/SEMAPHORE_COMPATIBILITY.md):
- Confirmed Semaphore v4 (`@semaphore-protocol/circuits`, MIT License, PSE ceremony-backed) uses Groth16 over BN254 with 4 public signals `[merkleTreeRoot, nullifier, _hash(message), _hash(scope)]` and LeanIMT depths `1..32`.
- Fully compatible with Veil Core (`~3.32M` gas for 4 public inputs) and Gno's native `crypto/keccak256` for on-chain `_hash(message)` / `_hash(scope)` computation.

---

## 5. Security Hygiene

- Added [.gitignore](file:///e:/Veil%20ZK%20protocol/.gitignore) excluding keys, mnemonics, `.env`, `gnokey-home/`, and dev-only `circuits/build/` artifacts (keeping only `vectors.json`).
- Removed plaintext passphrase examples from [PHASE_0_FEASIBILITY_REPORT.md](file:///e:/Veil%20ZK%20protocol/docs/PHASE_0_FEASIBILITY_REPORT.md).
