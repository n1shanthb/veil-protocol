# Veil Protocol — Onyx (`onyx-1`) Execution Report

**Date:** November 27, 2026  
**Network:** `onyx-1` (`https://rpc.onyx.testnets.gno.land:443`, `v1.8.0-rc.1`, checked at height `1445390+`)  
**Deployer:** `g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04` (Balance before deployment: `275,291,500 ugnot`)

---

## Separate Verdicts

| Gate | Verdict | Status & Evidence |
| :--- | :--- | :--- |
| **1. Package Submission** | **GO** | `veil_vote/v3`, `veil_registry/v1`, and `cubic_check_verifier` submitted cleanly to `onyx-1` (`addpkg` succeeded on-chain). |
| **2. Activation** | **GO** | All 5 packages (`groth16/v2`, `semaphore/v2`, `veil_vote/v3`, `veil_registry/v1`, `cubic_check_verifier`) are **active** and callable on `onyx-1`. |
| **3. Generic Proof Execution** | **GO** | `cubic_check_verifier.Verify` executed via `MsgCall` at height `1449976` (`12,026,099` gas, `VerifiedCount() == 1`). Tampered proof, wrong signal, and scalar alias (`r + 0x23`) all rejected. |
| **4. Semaphore Execution** | **GO** | `veil_vote/v3` group created (`1`), 3 members added, root published, poll created (`1`), real Semaphore v4 vote committed at height `1450048` (`16,823,046` gas). Duplicate nullifier and invalid option rejected. |
| **5. Registry** | **GO** | `veil_registry/v1.RegisterVerifier` committed at height `1450059` (`3,972,054` gas). Unauthorized namespace registration rejected. `GetVerifier(1)` and `ListVerifiersPaged(0, 10)` verified. |
| **6. Browser-to-Onyx Integration** | **GO** | Sponsored Semaphore v4 vote relayed via `relayer/server.js` to `veil_vote/v3` and committed at height `1450086` (`16,846,339` gas). Final tallies: Option 0 (`Yes`) = `1`, Option 1 (`No`) = `1`. |

---

## Step 1 — Active Dependency Verification & Hash Reconciliation

- **Network Check:** `https://rpc.onyx.testnets.gno.land:443/status` -> `network: onyx-1`, `height: 1445390`, `version: v1.8.0-rc.1`.
- **Wallet Balance:** `275,291,500 ugnot`.
- **On-Chain Source Integrity (`vm/qfile` vs local `main`):**
  - On Windows (`CRLF` working tree), raw file SHA-256 differs from LF-normalized `vm/qfile` output. Both `rawSha256` and `lfSha256` are recorded in [`docs/RELEASE_MANIFEST.json`](./RELEASE_MANIFEST.json).
  - `gno.land/p/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/groth16/v2/groth16.gno`: **Active & Exact LF Match** (`lfSha256`: `700e35fc3a521ba979eb7bc7f9602308c9f10a1f881f5c32a54d55d4063d5917`, `rawSha256`: `881a20a5eb295d08dabf3c0d41d8dc47d900d4d62096c1f270a01b1350b67931`).
  - `gno.land/p/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/semaphore/v2/semaphore.gno`: **Active & Exact LF Match** (`lfSha256`: `ebd9fcb6b3781f1363fafc4571d954ccfa51834d253ee93474cc9c01b8f0ee10`, `rawSha256`: `c02a60583d3bdc61d0ff301761bee29c2db19dd1ff3743378ce992c0f93f0ca1`).

---

## Step 2 — RC2 Package Submissions & GPAS Enablement Diagnosis (`onyx-1`)

| Package Path | Chain / Height | Tx Hash | Gas Used | Fee | GPAS Status |
| :--- | :---: | :--- | :---: | :---: | :--- |
| `gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/veil_vote/v3` | `onyx-1` / `1445403` | `n8gsscfoGHMyEy5p0yj9cDlg/M9Io5gWcH9Numi5cOw=` | `47,790,095` | `2,000,000 ugnot` | `pass` (`at: 2026-11-27T07:06:54Z`, no `enable_at`, `On chain` empty) |
| `gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/veil_registry/v1` | `onyx-1` / `1445405` | `Z3nPuj8AoPVXdPOuWx3czo+Bk9dJQPhbVpNRsbJzJkw=` | `17,058,134` | `1,000,000 ugnot` | `pass` (`at: 2026-11-27T07:07:00Z`, no `enable_at`, `On chain` empty) |
| `gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/cubic_check_verifier` | `onyx-1` / `1445406` | `2UQcV5zMkm+5F7RzJ2qzRtdvuaRzpkSkvP7icJPS3FQ=` | `6,480,793` | `1,000,000 ugnot` | `pass` (`at: 2026-11-27T07:07:06Z`, no `enable_at`, `On chain` empty) |

- **GPAS Enabler Check:** Queried `vm/qfile` on `onyx-1` for all three realms plus unrelated `gno.land/r/g1h2fd0ykqkfgh6heggn6uh0r9qnxz9ujpka5fce/tavernpay` (`pass` at `07:16:48Z`); all return `package ... is not available`. GPAS has passed all checks, but its on-chain enabler has not yet committed the enablement transactions.

---

## Steps 3–6 — Committed On-Chain Execution Evidence (`onyx-1`)

### Step 3 — Generic Groth16 Proof Verification (`cubic_check_verifier`)
- **Valid Proof (`x^3 + x + 5 = 35`, public input `0x23`):**
  - Tx Hash: `DjxfWwuq0uN3Yr3efXlcBRwU0qceIo+RmGJy4CuD1X8=` | Height: `1449976` | Gas Used: `12,026,099` | Result: `("VALID" string)`
  - Post-tx state: `VerifiedCount()` -> `(1 uint64)`
- **Tampered Proof (`A` last byte flipped):** Rejected (`groth16: invalid curve or subgroup point`).
- **Wrong Public Signal (`0x24`):** Rejected (`groth16: pairing verification failed`).
- **Scalar Alias (`r + 0x23`):** Rejected (`groth16: non-canonical scalar field element`).

### Step 4 — Semaphore v4 Voting (`veil_vote/v3`)
- `CreateGroup(1, 10, g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04)`: Height `1449991`, Gas `4,396,581`, Tx `Fz3Dr7zSGEfWlz6WlQsd/HBaxMo6h5L7EjS9l056zLY=`
- `AddMember(1, C1)`: Height `1449992`, Gas `5,212,258`, Tx `ZfcYwL+k6VcVmgaWJ0YPpJpFxjEoNEvqfjYAd67Feqo=`
- `AddMember(1, C2)`: Height `1449993`, Gas `5,414,534`, Tx `soBuPO81+gOUBYkeaKsAEz9g/o1hWG8tFwzYeGmo1eo=`
- `AddMember(1, C3)`: Height `1449994`, Gas `5,556,920`, Tx `OWBab4wLWzrXeDwDXH5L04MxxcbmQk1VZJpOoDcGp4A=`
- `PublishRoot(1, 14adde57...)`: Height `1449995`, Gas `5,505,185`, Tx `1BwezsDaq32qxIXRQX7bNGNSylDtqthpQuRuj0v8BYU=`
- `CreatePoll(1, 1, "Onyx Test Poll", "Yes,No", 0, 0)`: Height `1450005`, Gas `4,824,789`, Tx `gC7xJFC/iqH6gp0tDyvFBy5ekYYN5URqnl/cKfY53X8=`
- `Vote(1, 10, ..., option=0)` (`onyx-voter-1`): Height `1450048`, Gas `16,823,046`, Tx `OT6PYZz62/AoLhXcERJHbZEFbXE4H6R5Ev7uarPWB+4=`, Result: `("RECORDED" string)`
- **Duplicate Vote:** Rejected (`semaphore: nullifier already used in scope`).
- **Invalid Option (`99`):** Rejected (`veil_vote: invalid vote option`).
- **Snapshot & Tally Queries:** `GetPollTally(1, 0)` -> `1 uint64`; `GetPollCommitmentsPaged(1, 0, 10)` returned all 3 commitments.

### Step 5 — Verifier Registry (`veil_registry/v1`)
- `RegisterVerifier("gno.land/r/.../cubic_check_verifier", ...)`: Height `1450059`, Gas `3,972,054`, Tx `jTLzw3u3QQQHAYFT3gHdxkFA+9HahGNlSRW6ENzwQr4=`, Result: `(1 uint64)`
- **Unauthorized Namespace Registration:** Rejected (`veil_registry: caller does not own package namespace`).
- **Queries:** `GetVerifier(1)` and `ListVerifiersPaged(0, 10)` returned record `#1` (`groth16/bn254|1|v1.0.0|active`).

### Step 6 — Browser-to-Onyx Sponsored Transaction (`relayer/server.js`)
- Sponsored `Vote(1, 10, ..., option=1)` (`onyx-voter-2`) relayed via `http://127.0.0.1:8787/api/relay/vote`:
  - Tx Hash: `aVihcitjgHh8xfk6Y8elCeSKU4ypRO3l/TyK190+qTY=` | Height: `1450086` | Gas Used: `16,846,339`
  - Post-tx state: `GetPollTally(1, 0)` -> `(1 uint64)`, `GetPollTally(1, 1)` -> `(1 uint64)`.
