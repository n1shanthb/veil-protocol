# Veil Protocol — Architecture, Installation & API Reference

## 1. Architecture Overview

Veil Protocol is general-purpose zero-knowledge developer infrastructure for **Gno.land** (`gnolang/gno` `v1.8.0-rc.1`).

```
+-------------------------------------------------------------------+
|  Client / Developer Layer                                         |
|  - @veil-protocol/sdk (TypeScript)                                |
|  - Veil CLI / Forge (cli/veil.js)                                 |
|  - Veil Studio Web App (apps/web: Vote, Playground, Forge, Docs)  |
+---------------------------------+---------------------------------+
                                  | JSON-RPC / Sponsored Relayer
                                  v
+-------------------------------------------------------------------+
|  Gno.land On-Chain Layer (GnoVM + native crypto/bn254)            |
|  1. gno/p/groth16  (groth16/v2)   : General Groth16/BN254 engine  |
|  2. gno/p/semaphore (semaphore/v2): Group/VK/Nullifier/Scope      |
|  3. gno/r/veil_registry (v1)      : On-chain VK & circuit registry|
|  4. gno/r/veil_vote (veil_vote/v3): Reference anonymous voting    |
+-------------------------------------------------------------------+
```

### Frozen V1 Package Graph

| Package | Path | Role |
| :--- | :--- | :--- |
| **Veil Core** | `gno.land/p/.../groth16/v2` | General-purpose Groth16/BN254 verifier (`crypto/bn254` + `crypto/keccak256`) |
| **Veil Primitives** | `gno.land/p/.../semaphore/v2` | `VKRegistry`, `GroupRegistry`, `NullifierSet`, `DomainScopeFull`, `VerifyAndConsume` |
| **Veil Registry** | `gno.land/r/.../veil_registry/v1` | Permissioned/ownership-gated on-chain verifier key & circuit metadata registry |
| **Veil Vote** | `gno.land/r/.../veil_vote/v3` | Reference anonymous voting realm with poll snapshots & `TransferAdmin` |

---

## 2. Installation Guide

### Prerequisites
- **Go:** `1.25+` (for building `gno`, `gnokey`, `gnoland`)
- **Node.js:** `v22+` and `npm`
- **Pinned Gno Toolchain (`v1.8.0-rc.1`, commit `fc79041f4cd1a7b3ed4b316dc5ac14162eb78730`):**
  ```bash
  git clone --depth 1 --branch v1.8.0-rc.1 https://github.com/gnolang/gno.git /tmp/gno
  cd /tmp/gno
  go build -o /usr/local/bin/gno ./gnovm/cmd/gno
  go build -o /usr/local/bin/gnokey ./gno.land/cmd/gnokey
  go build -o /usr/local/bin/gnoland ./gno.land/cmd/gnoland
  ```

### Workspace Setup
```bash
npm ci
cd sdk && npm ci && npm run build && npm test
cd ../apps/web && npm ci && npm run build
```

---

## 3. API Reference

### Veil Core (`gno/p/groth16`)
- `ParseVerifyingKeyHex(alpha, beta, gamma, delta string, ic []string) (*VerifyingKey, error)`
- `ParseProofHex(a, b, c string) (*Proof, error)`
- `ParsePublicInputsHex(inputs []string) ([][]byte, error)`
- `Verify(vk *VerifyingKey, proof *Proof, publicInputs [][]byte) error`

### Veil Primitives (`gno/p/semaphore`)
- `NewVKRegistry() *VKRegistry` / `Register(depth int, vk *groth16.VerifyingKey) error`
- `NewGroupRegistry() *GroupRegistry` / `CreateGroup(...)` / `AddMember(...)` / `PublishRoot(...)`
- `NewNullifierSet() *NullifierSet`
- `DomainScopeFull(chainID, appDomain string, groupID, pollID uint64) []byte`
- `VerifyAndConsume(...) error`

### Veil Vote (`gno/r/veil_vote`)
- `TransferAdmin(cur realm, newAdmin address)`
- `CreateGroup(cur realm, groupID uint64, depth int, rootPublisher address)`
- `AddMember(cur realm, groupID uint64, commitmentHex string)`
- `PublishRoot(cur realm, groupID uint64, rootHex string)`
- `CreatePoll(cur realm, pollID, groupID uint64, title, optionsCSV string, openHeight, closeHeight int64)`
- `ClosePoll(cur realm, pollID uint64)`
- `Vote(cur realm, pollID uint64, depth int, rootHex, nullifierHex string, optionIdx int, aHex, bHex, cHex string) string`
- Read-only queries: `GetPollTally(pollID uint64, optionIdx int) uint64`, `GetPollInfo(pollID uint64) string`, `GetPollCommitments(pollID uint64) string`, `GetGroupCommitments(groupID uint64) string`

### Veil Registry (`gno/r/veil_registry`)
- `RegisterVerifier(cur realm, name, circuitHash, pkgPath, vkSummary string, numPublicInputs int) uint64`
- `DeprecateVerifier(cur realm, id uint64)` (owner-only)
- `GetVerifier(id uint64) string` / `Count() uint64` / `ListActive() string`

### TypeScript SDK (`@veil-protocol/sdk`)
- `validateAndConvertVK(vkJson)`
- `encodePublicInputs(publicSignals)`
- `validateAndConvertProof(proofJson)`
- `deriveCanonicalScope(chainId, appDomain, groupId, pollId)`
- `createIdentity(secret?)`
- `generateVoteProof(params)`

### Veil Forge CLI (`cli/veil.js`)
- `node cli/veil.js inspect <verification_key.json>`
- `node cli/veil.js generate <verification_key.json> --out <dir> --pkgpath <path> --core <groth16_path>`
- `node cli/veil.js test --dir <dir> --proof <proof.json> --public <public.json>`

---

## 4. Deployment Instructions (Local `gnoland`)

1. Start local `gnoland`:
   ```bash
   gnoland start -lazy -chainid dev -gnoroot-dir /tmp/gno
   ```
2. Deploy in dependency order:
   1. `gno/p/groth16` -> `.../groth16/v2`
   2. `gno/p/semaphore` -> `.../semaphore/v2`
   3. `gno/r/veil_registry` -> `.../veil_registry/v1`
   4. `gno/r/veil_vote` -> `.../veil_vote/v3`
3. Start Sponsored Relayer (`relayer/server.js`) with `VEIL_RPC_URL`, `VEIL_CHAIN_ID`, `VEIL_VOTE_REALM`, `VEIL_RELAYER_KEY`, `VEIL_RELAYER_PASSPHRASE`, and `VEIL_ALLOWED_ORIGINS`.

---

## 5. Measured vs. Estimated Performance

| Operation | Measured Result | Source |
| :--- | :--- | :--- |
| Groth16 Verify (1 input, GnoVM) | `3,238,181` gas (net ~`2.89M` over `349,770` baseline) | `gno test` (`TestGasBench_1_Verify1Input`) |
| Groth16 Verify (8 inputs, GnoVM) | `4,247,514` gas | `gno test` (`TestGasBench_4_Verify8Inputs`) |
| Semaphore v4 Depth-10 Vote Tx (local `gnoland`) | `16,667,467` – `16,712,669` gas | `local_e2e_relay.js` & Playwright Chromium |
| Interpreted Poseidon2 Single Hash (GnoVM) | `1,780,981,550` gas (`0.92s`) | `gno test` (`TestPoseidon2GasBenchmark_1_SingleHash`) |
| Client-Side Semaphore v4 Proof (Node SDK) | `727ms` | `local_e2e_relay.js` |
| Client-Side Semaphore v4 Proof (Browser) | `2,339ms` (Chromium) / `3,127ms` (Firefox) | `apps/web/e2e.mjs` |
| Veil Forge CLI (`inspect` + `generate` + `test`) | `1.79s` | Timed CLI developer journey (`cubic_check`) |

*Estimated:* Multi-level on-chain LeanIMT (depth 10 = ~10 Poseidon2 hashes) would exceed `17.8B` gas in interpreted GnoVM without a native Poseidon precompile, which is why V1 uses an authorized `RootPublisher` model.
