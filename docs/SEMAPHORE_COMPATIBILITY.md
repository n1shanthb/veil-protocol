# Semaphore v4 Compatibility & Integration Report

**Target Circuit:** `@semaphore-protocol/circuits` (Semaphore v4)  
**Target Verifier:** Veil Core (`gno.land/p/.../groth16`) + Veil Forge CLI (`cli/veil.js`)

---

## 1. Cryptographic & Format Compatibility

| Dimension | Semaphore v4 | Veil Core / Forge | Compatibility |
| --- | --- | --- | --- |
| **Proof System** | Groth16 | Groth16 | Expected compatibility — pending integration verification |
| **Elliptic Curve** | BN254 (`bn128`) | BN254 (`crypto/bn254`) | Expected compatibility — pending integration verification |
| **VK / Proof Format** | `snarkjs` JSON (`verification_key.json`, `proof.json`) | `veil inspect` / `veil generate` import `snarkjs` JSON | Expected compatibility — pending integration verification |
| **G2 Limb Order** | `snarkjs` `[real, imag]` | EIP-197 `x_imag \| x_real \| y_imag \| y_real` | Handled by Veil Forge |
| **Public Input Count** | 4 (`IC` length = 5) | `MaxPublicInputs = 64` (4 inputs: `~3.32M` gas) | Expected compatibility — pending integration verification |

No circuit-specific changes are required in Veil Core (`groth16.gno`). Semaphore v4 verification keys can be imported directly via `veil generate`.

---

## 2. Public-Input Ordering & Hashing

Semaphore v4 (`semaphore.circom`) defines **4 public signals** in the following exact order:

1. `merkleTreeRoot` — Root of the group's LeanIMT (Lean Incremental Merkle Tree).
2. `nullifier` — `Poseidon(scope, secret)` where `secret` is derived from the EdDSA private key.
3. `messageHash` — `_hash(message)` (Keccak-256 of the 32-byte padded message, right-shifted by 8 bits: `keccak256(message) >> 8` so the 248-bit digest is strictly `< r`).
4. `scopeHash` — `_hash(scope)` (`keccak256(scope) >> 8`).

> [!IMPORTANT]
> Gno includes `crypto/keccak256` in its standard library (`gnovm/stdlibs/crypto/keccak256`). Note that zeroing the most significant byte (`digest[0] = 0`) is **not** equivalent to `uint256(keccak256(...)) >> 8`. To match Semaphore v4's `>> 8` right-shift in big-endian 32-byte form, the Gno hasher must set `out[0] = 0` and `copy(out[1:32], digest[0:31])` (dropping the least-significant byte `digest[31]` and shifting every byte right by 8 bits).

---

## 3. Protocol Semantics for Gno Realms

- **Identity Commitments:** In Semaphore v4, an identity is an EdDSA BabyJubJub keypair; the commitment is `Poseidon(publicKey.Ax, publicKey.Ay)`.
- **Merkle Tree Membership (LeanIMT):** Uses Poseidon(2) hashing and supports dynamic group depths from **1 to 32**. Because Groth16 circuits are depth-parameterized, each supported depth (`1..32`) has its own `verification_key.json` and `.zkey` artifact.
- **Nullifier Scope & Replay Protection:** The Gno application realm (e.g., anonymous voting) must maintain a persistent `avl.Tree` (or map) of spent `(scope, nullifier)` or `nullifier` keys and reject any proof whose `nullifier` has already been recorded.
- **Message Binding:** `messageHash` is constrained inside `semaphore.circom` (`dummySquare <== message * message`), preventing proof malleability across different messages (e.g., changing a vote choice while reusing a proof).
- **Group Root Validation:** The Gno realm must verify that `merkleTreeRoot` matches the current (or a recent valid historical) LeanIMT root of the target group.

---

## 4. Trusted Setup Provenance & Licensing

- **Trusted Setup:** Semaphore v4 circuit artifacts (`snark-artifacts.pse.dev`) are backed by PSE's Perpetual Powers of Tau and the Semaphore v4 multi-party Phase 2 ceremony.
- **Licensing:** `semaphore-protocol/semaphore` is distributed under the **MIT License**, permitting commercial and open-source use, modification, and redistribution of circuits and verification keys.
- **Artifact Distribution:** For production Gno apps, only the ceremony-backed `verification_key.json` (or generated Gno `verifier.gno`) needs to be deployed on-chain; `.wasm` and `.zkey` files are fetched client-side for proof generation.

---

## 5. Recommended Integration Architecture (Phase 2)

1. Use `veil generate semaphore_vk_depth20.json --out gno/r/semaphore_verifier` to produce the pure Groth16 verifier realm using Veil Core.
2. Build a thin `r/veil/semaphore` application realm that tracks group LeanIMT roots and spent nullifiers, computes `_hash(message)` / `_hash(scope)` via `crypto/keccak256`, and calls `groth16.Verify`.
3. Keep all Phase 0/1 dev-only `.ptau`/`.zkey` artifacts strictly isolated from ceremony-backed Semaphore v4 artifacts.
