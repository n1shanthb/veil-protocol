# Veil Protocol — Phase 0 Technical Feasibility Report

**Date:** November 26, 2026  
**Verdict:** **CONDITIONAL GO**  
*(Cryptographic foundation, security tests, `crypto/bn254` availability on `onyx-1`, and `MsgAddPackage` submissions on `onyx-1` all succeeded; live `MsgCall` execution on `onyx-1` is blocked solely by Onyx's `inert` code-submission policy awaiting `MsgEnablePackage` approval and the `run_submitters` allowlist on `MsgRun`.)*

---

## 1. Executive Summary

Gno.land (`v1.8.0-rc.1`, live on Onyx `onyx-1`) includes a native `crypto/bn254` standard library package (`gnovm/stdlibs/crypto/bn254`) exposing EVM-compatible BN254 precompile primitives (`G1Add`, `G1Mul`, and `PairingCheck`) backed by `github.com/consensys/gnark-crypto v0.20.1`.

We implemented a general-purpose Groth16/BN254 verifier package ([groth16.gno](file:///e:/Veil%20ZK%20protocol/gno/p/groth16/groth16.gno)) and a minimal verification realm ([veil_verifier.gno](file:///e:/Veil%20ZK%20protocol/gno/r/veil_verifier/veil_verifier.gno)), generated real Groth16 proofs from two independent Circom 2.2.3 circuits using `snarkjs@0.7.5`, and verified identical proofs in both `snarkjs` and the GnoVM. All 9 local `gno test` suites in `p/groth16` and the realm test in `r/veil_verifier` passed.

We funded deployer account `g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04` (`300000000ugnot`, account `2292`) and successfully broadcast `MsgAddPackage` transactions for both `groth16` (block `1422595`, `31255371` gas) and `veil_verifier` (block `1422602`, `10662864` gas) on `onyx-1`. However, `MsgCall` simulation failed with `unexpected node with location .../veil_verifier:0:0` and `vm/qfile` reported the packages unavailable because `onyx-1` operates under `CodeSubmissionPolicyInert` (which parks newly submitted packages in `inert_pkg:<path>` until an approver submits `MsgEnablePackage`), and `MsgRun` is restricted via `run_submitters` to `g1aeddlftlfk27ret5rf750d7w5dume3kcsm8r8m`.

---

## 2. Gno Toolchain & Onyx Network Investigation

| Parameter | Observed Value |
| --- | --- |
| **Onyx Chain ID** | `onyx-1` |
| **Onyx RPC Endpoint** | `https://rpc.onyx.testnets.gno.land:443` |
| **Onyx Build Version** | `v1.8.0-rc.1` (moniker `gno-core-rpc-public-i-0525e287d7d4e058d`) |
| **Pinned Gno Source Commit** | `fc79041f4cd1a7b3ed4b316dc5ac14162eb78730` (`tags/v1.8.0-rc.1`) |
| **Go Toolchain** | `go1.27.4 windows/amd64` (repo `go.mod` specifies `go 1.25.9`) |
| **Circom / snarkjs** | `circom 2.2.3` / `snarkjs@0.7.5` |

### Native BN254 & CometBLS Findings

1. **`crypto/bn254` (`E:\toolchains\gno\gnovm\stdlibs\crypto\bn254`)**
   - Confirmed live on `onyx-1` via `gnokey query -remote https://rpc.onyx.testnets.gno.land:443 "vm/qdoc" -data "crypto/bn254"`.
   - Exposes `G1Add` (128B -> 64B), `G1Mul` (96B -> 64B), and `PairingCheck` (N × 192B -> 32B `0x...01` / `0x...00`).
   - G2 points use EIP-197 **imaginary-first** encoding: `x_imag | x_real | y_imag | y_real` (32-byte big-endian per limb), whereas `snarkjs` JSON exports `[real, imag]`. Our conversion in [generate_proofs.js](file:///e:/Veil%20ZK%20protocol/scripts/generate_proofs.js) swaps the limbs into EIP-197 order.
   - `bn254.go` (`parseG1`, `parseG2`) enforces `< fpModulus`, curve membership (`IsOnCurve()`), and G2 subgroup membership (`IsInSubGroup()`). However, `X_g1Mul` reduces scalars modulo `r` internally, so our Gno verifier explicitly enforces `scalar < r` (`ErrNonCanonicalScalar`).
2. **CometBLS Groth16 Pattern (`E:\toolchains\gno\gnovm\stdlibs\crypto\cometblszk`)**
   - `cometblszk/verifier.gno` demonstrates the pure-Gno Groth16 verification pattern: computing the public-input MSM via `bn254.G1Mul`/`bn254.G1Add` and checking the 4-pair pairing product via `bn254.PairingCheck`.
   - `gnovm/stdlibs/native_gas.go` lists draft native gas weights: `g1Add` base `14883`, `g1Mul` base `44465`, `pairingCheck` base `457574` + slope `1786890 / 1024` bytes.

---

## 3. Circuits, Trusted Setup & Proof Artifacts

> [!WARNING]
> **Development-Only Artifacts:** All `.ptau`, `.zkey`, `verification_key.json`, and `proof.json` files under `circuits/build/` were generated with a local single-party development Powers of Tau (`pot12`, deterministic entropy) for Phase 0 testing only. They are **not** ceremony-backed and **must not** be used in production.

Two independent Circom 2.0.0 circuits were compiled and proven with `snarkjs`:

1. **[multiplier.circom](file:///e:/Veil%20ZK%20protocol/circuits/multiplier.circom)** — Proves `a * b == c` with 1 public signal (`c = 91`, private `a = 7, b = 13`). `snarkjs groth16 verify` output: `OK!`.
2. **[sum_of_squares.circom](file:///e:/Veil%20ZK%20protocol/circuits/sum_of_squares.circom)** — Proves `x^2 + y^2 == target` with 2 public signals (`ok = 1, target = 25`, private `x = 3, y = 4`). `snarkjs groth16 verify` output: `OK!`.

Exported test vectors are stored in [vectors.json](file:///e:/Veil%20ZK%20protocol/circuits/build/vectors.json).

---

## 4. Gno Verifier Implementation & Security Tests

- **Verifier Package:** [groth16.gno](file:///e:/Veil%20ZK%20protocol/gno/p/groth16/groth16.gno) (`gno.land/p/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/groth16`)
- **Minimal Realm:** [veil_verifier.gno](file:///e:/Veil%20ZK%20protocol/gno/r/veil_verifier/veil_verifier.gno) (`gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/veil_verifier`)

### Mandatory Security Test Matrix (`gno test -v -root-dir E:\toolchains\gno ./...`)

| Security Requirement | Test Case | Observed Result | GnoVM Gas |
| --- | --- | --- | --- |
| Valid proof accepted (2 circuits) | `TestValidProofsAccepted` | PASS | `50849659` |
| Modified proof rejected | `TestModifiedProofRejected` | PASS | `49000772` |
| Modified public input rejected | `TestModifiedPublicInputRejected` | PASS | `16627035` |
| Incorrect verification key rejected | `TestIncorrectVerifyingKeyRejected` | PASS | `38490966` |
| Incorrect number of public inputs rejected | `TestIncorrectPublicInputCountRejected` | PASS | `14563770` |
| Malformed curve points rejected | `TestMalformedCurvePointsRejected` | PASS | `23369298` |
| Noncanonical field elements (`>= p`, `>= r`) rejected | `TestNonCanonicalFieldElementsRejected` | PASS | `23320211` |
| Invalid subgroup G2 point rejected | `TestInvalidSubgroupG2Rejected` | PASS | `18440537` |
| Invalid encodings handled without panics | `TestInvalidEncodingsNoPanic` | PASS | `14211933` |
| Realm verification (both circuits) | `TestRealmVerifyMultiplierAndSumOfSquares` | PASS | `40473929` |

All 9 tests in `.\p\groth16` passed in `1.33s`, and `.\r\veil_verifier` passed in `1.23s`.

---

## 5. Onyx Deployment Evidence & Blocker Analysis

- **Deployer Address:** `g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04` (funded `300000000ugnot`, account `2292`, final sequence `2`, remaining balance `298000000ugnot`)

### On-Chain Deployment Transactions (`onyx-1`)

| Package Path | Block Height | Tx Hash | Gas Used / Wanted | `deliver_tx` Result |
| --- | --- | --- | --- | --- |
| `gno.land/p/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/groth16` | `1422595` | `Lzw58UhljTFqrBYQIsSZdFwhdUo8RaHfm0ky9SjVM6o=` | `31255371` / `35000000` | `msg:0,success:true` |
| `gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/veil_verifier` | `1422602` | `N1Z0qlZmpyleq3g3hs95+ss/d9Gx+FRz3SmEiDelvBo=` | `10662864` / `20000000` | `msg:0,success:true` |

### Proof Call & Testnet Policy Blocker

1. **`MsgCall` (`veil_verifier.VerifyProof`)** failed in simulation (`GAS USED: 759470`) with:
   `recovered: unexpected node with location gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/veil_verifier:0:0`
   and `vm/qfile` returned `package "..." is not available`.
2. **Root Cause (`gno.land/pkg/sdk/vm/keeper.go:954-984` & `gno.land/r/sys/params`):**
   - `onyx-1` runs in **`inert` code submission mode** (`CodeSubmissionPolicyInert`), so `MsgAddPackage` stores submitted packages in `inert_pkg:<path>` without activating them in the live VM store until an approver submits `MsgEnablePackage`.
   - `MsgRun` is also restricted on `onyx-1` via `run_submitters` to `g1aeddlftlfk27ret5rf750d7w5dume3kcsm8r8m`; attempting `gnokey maketx run` returned `std.UnauthorizedError: g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04 is not authorized to send MsgRun; see the vm run_submitters param`.

---

## 6. Reproducible Commands

```powershell
# 1. Generate circuits, dev-only setups, and Groth16 proofs
node "e:\Veil ZK protocol\scripts\generate_proofs.js"

# 2. Run all Gno verifier & realm tests against pinned v1.8.0-rc.1 toolchain
Set-Location "e:\Veil ZK protocol\gno"
E:\toolchains\bin\gno.exe test -v -root-dir E:\toolchains\gno ./...

# 3. Deploy packages to onyx-1 (already broadcast; parked in inert_pkg awaiting MsgEnablePackage)
# Enter your gnokey passphrase interactively when prompted
E:\toolchains\bin\gnokey.exe maketx addpkg `
  -pkgdir "e:\Veil ZK protocol\gno\p\groth16" `
  -pkgpath "gno.land/p/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/groth16" `
  -gas-fee 1000000ugnot -gas-wanted 35000000 -max-deposit 50000000ugnot `
  -chainid onyx-1 -remote https://rpc.onyx.testnets.gno.land:443 -broadcast veil-dev

E:\toolchains\bin\gnokey.exe maketx addpkg `
  -pkgdir "e:\Veil ZK protocol\gno\r\veil_verifier" `
  -pkgpath "gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/veil_verifier" `
  -gas-fee 1000000ugnot -gas-wanted 20000000 -max-deposit 50000000ugnot `
  -chainid onyx-1 -remote https://rpc.onyx.testnets.gno.land:443 -broadcast veil-dev
```

---

## 7. Known Limitations & Security Assumptions

1. **Trusted Setup:** Groth16 requires a circuit-specific Phase 2 setup on top of a universal Powers of Tau. Production deployments must use ceremony-backed `.ptau` and `.zkey` artifacts.
2. **G2 Encoding:** Callers must supply G2 points in EIP-197 imaginary-first order (`x_imag | x_real | y_imag | y_real`). Swapping real/imag limbs causes curve/pairing rejection.
3. **Onyx Governance Gate:** Until `onyx-1` approvers enable the parked packages via `MsgEnablePackage` (or a permissionless testnet / local `gnoland` node is targeted), live `MsgCall` gas cannot be measured on `onyx-1`.
