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
- **On-Chain Source Integrity (`vm/qfile` vs local `main`, LF-normalized):**
  - `gno.land/p/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/groth16/v2/groth16.gno`: **Active & Exact LF Match** (`sha256: 700e35fc3a521ba979eb7bc7f9602308c9f10a1f881f5c32a54d55d4063d5917`)
  - `gno.land/p/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/semaphore/v2/semaphore.gno`: **Active & Exact LF Match** (`sha256: ebd9fcb6b3781f1363fafc4571d954ccfa51834d253ee93474cc9c01b8f0ee10`)
  - `gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/veil_vote/v3/veil_vote.gno`: **Active & Exact LF Match** (`sha256: c3ea4196dc81ce024daa88d4844516ddc2e989eac99239c22425df9926592eae`)
  - `gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/veil_registry/v1/veil_registry.gno`: **Active & Exact LF Match** (`sha256: ba8145df7c4ff21a79d16ade40e8857b20fd29dd089a610eef21678f300d440f`)
  - `gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/cubic_check_verifier/verifier.gno`: **Active & Exact LF Match** (`sha256: cc6d643de2328aaefe11029bdb9f92b995cd1ff66beaa118a7b5a485c936bc47`)

> [!IMPORTANT]
> **Trusted Root Publisher Limitation (V1):** `veil_vote/v3` relies on a designated `RootPublisher` address (`g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04` for Poll #1) to publish the LeanIMT root matching the group's commitments. While `CreatePoll` freezes the published root and membership count snapshot, voters must verify that the published root matches the reconstructed `GetPollCommitmentsPaged` commitments (performed automatically by `sdk` and Veil Studio).

---

## Step 2 — RC2 Package Submissions & GPAS Enablement Diagnosis (`onyx-1`)

| Package Path | Chain / Height | Tx Hash | Gas Used | Fee | GPAS Status |
| :--- | :---: | :--- | :---: | :---: | :--- |
| `gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/veil_vote/v3` | `onyx-1` / `1445403` | `n8gsscfoGHMyEy5p0yj9cDlg/M9Io5gWcH9Numi5cOw=` | `47,790,095` | `2,000,000 ugnot` | `pass` (`07:06:54Z`) -> **Active on-chain** (`vm/qfile` & `MsgCall` verified) |
| `gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/veil_registry/v1` | `onyx-1` / `1445405` | `Z3nPuj8AoPVXdPOuWx3czo+Bk9dJQPhbVpNRsbJzJkw=` | `17,058,134` | `1,000,000 ugnot` | `pass` (`07:07:00Z`) -> **Active on-chain** (`vm/qfile` & `MsgCall` verified) |
| `gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/cubic_check_verifier` | `onyx-1` / `1445406` | `2UQcV5zMkm+5F7RzJ2qzRtdvuaRzpkSkvP7icJPS3FQ=` | `6,480,793` | `1,000,000 ugnot` | `pass` (`07:07:06Z`) -> **Active on-chain** (`vm/qfile` & `MsgCall` verified) |

- **Historical GPAS Note:** All three RC2 realms passed GPAS checks at `07:06:54Z`–`07:07:06Z` and were subsequently enabled on-chain on `onyx-1` (confirmed live at `11:33 UTC` / `17:03+05:30` via `vm/qfile`, `vm/qeval`, and `MsgCall` execution).

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
- **CLI-Triggered Relayer Test (`veil-dev`):** Sponsored `Vote(1, 10, ..., option=1)` (`onyx-voter-2`):
  - Tx Hash: `aVihcitjgHh8xfk6Y8elCeSKU4ypRO3l/TyK190+qTY=` | Height: `1450086` | Gas Used: `16,846,339`
- **Dedicated Relayer Wallet (`veil-relayer`, `g1faqk82qzesyuhu6jp2nk666r8yd4cg3a2p59ey`):** Funded with `15,000,000 ugnot` at Height `1450339` (Tx `1fF6IM1XmHK0uw2udrW/55xgmYOeeYKhZNrIV39Sy8U=`).
- **Real Browser-to-Onyx E2E (`apps/web/e2e_onyx.mjs`, Chromium + Firefox):**
  - **Chromium:** Synced live Poll #1, verified reconstructed LeanIMT root (`14adde57e4863effcdf17af37edb304fee846e4e9d8da8ebed9844be2f8cdcee`), generated Semaphore v4 proof in `3,228ms`, submitted through `veil-relayer` -> committed Tx `i68sfeCLwFKrZPYbBGdyzEfyv4aFat1iMtBIwg4xBjo=` at Height `1450366` (`16,842,592` gas), and confirmed updated on-chain tally (`Yes=2, No=1`).
  - **Firefox:** Synced live Poll #1 (`Yes=2, No=1`), verified reconstructed root, and confirmed live `veil_registry/v1` records.

> [!NOTE]
> **Simulation Rejections vs. Committed Failed Transactions:** Negative test cases above (tampered proof, wrong public signal, scalar alias `r + 0x23`, duplicate nullifier, invalid option `99`, unauthorized namespace) were rejected during `gnokey` transaction simulation / `CheckTx` (`HEIGHT: 0`, no `TX HASH`, 0 committed failed transactions). Only valid state-transition transactions were committed into `onyx-1` blocks (`HEIGHT > 0`).
