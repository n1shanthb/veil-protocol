# Veil Protocol — Developer Quickstart & API Guide

## 1. Prerequisites (Clean Machine)

- **Node.js** `>= 20` (`node -v`)
- **Circom** `2.x` (`circom --version`) and **snarkjs** (`npm i -g snarkjs`)
- **Gno toolchain** (`gno` and `gnokey` built from `gnolang/gno` tag `v1.8.0-rc.1`, commit `fc79041f4cd1a7b3ed4b316dc5ac14162eb78730`)

## 2. Five-Minute Circuit-to-Verifier Quickstart

```bash
# 1. Inspect any snarkjs Groth16/BN254 verification key
node cli/veil.js inspect circuits/external/verification_key.json

# 2. Generate a deployable Gno verifier realm importing Veil Core (groth16/v2)
node cli/veil.js generate circuits/build/cubic_check/verification_key.json \
  --out examples/cubic_check_verifier \
  --pkgpath gno.land/r/<your-namespace>/cubic_check_verifier

# 3. Verify a real snarkjs proof inside GnoVM
node cli/veil.js test \
  --dir examples/cubic_check_verifier \
  --proof circuits/build/cubic_check/proof.json \
  --public circuits/build/cubic_check/public.json
```

## 3. Reproducible Test Commands

```bash
# All Gno Core, Primitives, Vote Realm & Generated Verifier tests
gno test -v ./gno/... ./examples/...

# Veil TypeScript SDK
cd sdk && npm install && npm run build && npm test

# Sponsored Relayer
node --test ./relayer/test/relayer.test.mjs

# Veil Web Platform (Vote + Studio)
cd apps/web && npm install && npm run build
```

## 4. Compatibility Matrix

| Component | Supported | Notes |
| --- | --- | --- |
| Proof System | Groth16 | PLONK / FFLONK rejected by `veil inspect` |
| Curve | BN254 (`bn128`) | Uses Gno native `crypto/bn254` |
| Public Inputs | `0..64` | Bounded by `groth16.MaxPublicInputs` |
| Semaphore | `v4.13.0` | Depth `10` registered in `veil_vote/v1`; `1..32` supported by `semaphore/v1` |
| Gno Release | `v1.8.0-rc.1` | Onyx (`onyx-1`) compatible |

## 5. TypeScript SDK API (`@veil-protocol/sdk`)

- `validateAndConvertVK(vk)` — Validates Groth16/BN254 VK and converts G2 to EIP-197 (`x_imag|x_real|y_imag|y_real`).
- `validateAndConvertProof(proof)` — Validates proof points (`< p`) and encodes EIP-197 hex.
- `encodePublicInputs(inputs)` — Validates canonical scalars (`< r`) and encodes 32-byte BE hex.
- `semaphoreHashToField(val)` — Exact `uint256(keccak256(toBeHex(val, 32))) >> 8`.
- `generateSemaphoreVoteProof({ identity, commitments, pollId, optionIndex, depth })` — Client-side Semaphore v4 proof generation.
- `buildVoteCallArgs(...)` / `buildVerifyCallArgs(...)` — Prepares `gnokey maketx call` arguments.
- `queryRealmRender(rpcUrl, realmPath)` — Queries live Gno realm state via `vm/qrender`.
