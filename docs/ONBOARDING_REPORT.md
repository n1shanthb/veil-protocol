# Veil Protocol — External Developer Onboarding Report

**Date:** November 27, 2026  
**Test Environment:** Fresh external directory outside the Veil repository (`scratch/onboarding_e2e`), Windows + Node.js v22 + `circom` + `snarkjs` + `gnokey`.  
**Test Circuit:** `square_diff.circom` (`out = a^2 - b^2`, private inputs `a=7, b=3`, public output `out=40`, 3 public signals in Circom 0.5).

---

## Measured Pipeline Timings

| Step | Action | Measured Time | Outcome |
| :--- | :--- | :---: | :--- |
| 1 | `circom square_diff.circom --r1cs --wasm --sym` | `0.59s` | Compiled R1CS + WASM |
| 2 | `snarkjs` Groth16 setup + zkey contribute + VK export + `fullprove` | `8.26s` | Generated `verification_key.json`, `proof.json`, `public.json` |
| 3 | `node cli/veil.js inspect` & `generate` | `0.12s` | Generated `square_diff_verifier` importing `groth16/v2` |
| 4 | `node cli/veil.js test` (local GnoVM verification) | `1.48s` | `TestVeilCLIProof` PASS (`10,508,795` gas), `TestGeneratedVKInitialized` PASS |
| 5 | `gnokey maketx addpkg` (`square_diff_verifier` to `onyx-1`) | ~`10s` | Committed at Height `1450416`, Gas `6,994,789`, Tx `yiX1meC+QGASVweH/CgHFfoadFgYDIYfbKItdORNve4=` |
| 6 | `veil_registry/v1.RegisterVerifier` | ~`10s` | Registered as ID `#2` at Height `1450409`, Gas `4,063,996`, Tx `xVVr/j/xliY7HrgNoehX7RiBT6Yab++mAzL7meURHyY=` |

---

## Friction Points Found & Remediations

1. **External `veil test` Core Resolution Failure (Fixed in `cli/veil.js`):**
   - *Friction:* Running `veil test` outside the Veil repository failed because `gno test` had no `gnowork.toml` resolving `gno.land/p/.../groth16/v2` and attempted a remote module fetch that failed on Windows path separators.
   - *Fix:* Updated `cmdTest` in [`cli/veil.js`](../cli/veil.js) to temporarily stage a local `.veil_core_tmp` copy of `gno/p/groth16` and a `gnowork.toml` during `veil test` when run outside a workspace, cleaning both up in `finally`.
2. **Legacy `circom` (npm 0.5) vs `circom` 2.x `pragma`:**
   - *Friction:* `npm install -g circom` installs legacy Circom 0.5, which rejects `pragma circom 2.0.0;` and `component main {public [...]}`.
   - *Recommendation:* Use the Rust `circom` 2.x binary for modern circuits, or omit `pragma` for legacy 0.5 circuits.
3. **`gnokey maketx addpkg` Flag Name (`-max-deposit` vs `-deposit`):**
   - *Friction:* `gnokey maketx addpkg` rejects `-deposit`; it uses `-max-deposit` (optional).
4. **GPAS Asynchronous Activation Delay on `onyx-1`:**
   - *Friction:* Newly deployed realms (`square_diff_verifier` at Height `1450416`) pass `addpkg` on-chain immediately, but `MsgCall` execution remains unavailable until GPAS completes review and broadcasts its on-chain enablement transaction.
