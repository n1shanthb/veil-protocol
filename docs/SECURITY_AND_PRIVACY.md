# Veil Protocol — Security Model, Privacy Limitations & Circuit Compatibility

## 1. Security Model
- **Cryptographic Soundness:** Groth16 verification over BN254 (`crypto/bn254`) enforces canonical base-field (`< p`) and scalar-field (`< r`) bounds, non-zero `Alpha`/`Beta`/`Gamma`/`Delta` points, G2 subgroup checks (via `crypto/bn254` `parseG2`), infinity handling, and `MaxPublicInputs = 64`.
- **Replay & Scope Isolation:** `DomainScopeFull` binds `chainID || appDomain || groupID || pollID` using `uint256(keccak256(...)) >> 8`, preventing cross-chain, cross-realm, cross-group, and cross-poll replay.
- **Relayer Hardening:** `relayer/server.js` enforces strict JSON schema validation, `sha256(rawBody)` `inFlight` deduplication, atomic temp-file + `renameSync` state persistence, fail-closed corrupt state handling, bounded rate limiting, and origin-restricted CORS (`VEIL_ALLOWED_ORIGINS`).

## 2. Privacy Limitations (V1)
1. **Public Vote Choice:** In `veil_vote`, the selected `optionIdx` is passed as a plaintext argument to `Vote(...)` and tallied on-chain. Zero-knowledge proofs hide *which* group member voted, not *what* option was chosen.
2. **Trusted `RootPublisher`:** `PublishRoot` trusts `RootPublisher` / `Admin` to publish an accurate LeanIMT root matching `g.Members`. `TransferAdmin` allows rotating control to a multi-sig or DAO.
3. **Relayer Metadata:** A hosted relayer observes caller IP addresses and submission timestamps; users seeking network-level privacy should use Tor/VPN or submit directly via `gnokey`.
4. **Developer UI Preset:** Veil Studio's default `"veil-phase2-member-0"` seed is for local testing only.

## 3. Trusted Setup Requirements
- **Development Circuits (`circuits/build/`):** Generated with a single-party development Powers of Tau (`pot12_final.ptau`) for local testing only; **never use dev zkeys in production**.
- **Semaphore v4 Depth-10 (`circuits/semaphore/`):** Uses official `@semaphore-protocol/proof@4.13.0` ceremony-backed artifacts:
  - `vk_depth10.json` SHA-256: `a6789bea2b941dbdb86e887cc9f958aa447dcbfa9ff725a886d99db2c2c47c3b`
  - `semaphore-10.wasm` SHA-256: `1e9e1e3ad9917164bc96c751e32fae724400b92063f5a2cfd22ca64674bf4f96`
  - `semaphore-10.zkey` SHA-256: `f644af6753be9d48454d8f9bb74bf2e9a416dd7d1a704c3cf1d50e535969a19a`

## 4. Circuit Compatibility Matrix

| Circuit / System | Curve | Public Inputs | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Circom 2.x + `snarkjs` Groth16 | BN254 (`bn128`) | `1..64` | **Supported** | Auto-converted to EIP-197 G2 by SDK/Forge |
| Semaphore v4 (`@semaphore-protocol/*@4.13.0`) Depth 10 | BN254 | `4` | **Supported (Ceremony-Backed)** | Verified in `veil_vote` & E2E |
| PLONK / FFLONK / BLS12-381 | — | — | **Not Supported in V1** | Gno stdlib provides `crypto/bn254` only |

## 5. Troubleshooting Guide
- **`out of gas error` on `addpkg`:** Increase `-gas-wanted` (e.g., `60000000` for `veil_vote/v3`).
- **`semaphore: nullifier already used in scope`:** Expected duplicate-vote rejection; generate a new identity or vote on a new `pollID`.
- **Onyx packages stay in `review`:** Query `https://gpas.latest.testnets.gno.land/api/packages?path=...`; see `docs/ONYX_SUPPORT_REQUEST.md` for escalation.
- **`snarkjs` Node process hangs:** Call `globalThis.curve_bn128.terminate()` after proof generation/verification.
