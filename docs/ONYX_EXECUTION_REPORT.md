# Veil Protocol — Onyx (`onyx-1`) Execution Report

**Date:** November 27, 2026  
**Network:** `onyx-1` (`https://rpc.onyx.testnets.gno.land:443`, `v1.8.0-rc.1`, checked at height `1445390+`)  
**Deployer:** `g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04` (Balance before deployment: `275,291,500 ugnot`)

---

## Separate Verdicts

| Gate | Verdict | Status & Evidence |
| :--- | :--- | :--- |
| **1. Package Submission** | **GO** | `veil_vote/v3`, `veil_registry/v1`, and `cubic_check_verifier` submitted cleanly to `onyx-1` (`addpkg` succeeded on-chain). |
| **2. Activation** | **PARTIAL (Awaiting GPAS On-Chain Enable)** | `groth16/v2` and `semaphore/v2` are **active** (`vm/qfile` verified, SHA-256 exact match). `veil_vote/v3`, `veil_registry/v1`, and `cubic_check_verifier` all **passed GPAS** (`status: "pass"` at `07:06:54Z`–`07:07:06Z`) and are awaiting GPAS's on-chain enablement transaction (`On chain` empty; `vm/qfile` returns `invalid package`). |
| **3. Generic Proof Execution** | **BLOCKED (Pending Enablement)** | `cubic_check_verifier` passed GPAS (`07:07:06Z`), awaiting GPAS on-chain enablement. `MsgRun` (`gnokey maketx run`) is restricted on `onyx-1` (`not authorized to send MsgRun; see the vm run_submitters param`). |
| **4. Semaphore Execution** | **BLOCKED (Pending Enablement)** | `veil_vote/v3` passed GPAS (`07:06:54Z`), awaiting GPAS on-chain enablement. |
| **5. Registry** | **BLOCKED (Pending Enablement)** | `veil_registry/v1` passed GPAS (`07:07:00Z`), awaiting GPAS on-chain enablement. |
| **6. Browser-to-Onyx Integration** | **BLOCKED (Pending Enablement)** | Awaits `veil_vote/v3` on-chain enablement on `onyx-1`. |

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

## Steps 3–6 — Execution Status & Next Action

- **Attempted `MsgRun` (`gnokey maketx run`):** Rejected by `onyx-1` as expected (`std.UnauthorizedError: g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04 is not authorized to send MsgRun; see the vm run_submitters param`).
- **Next Action:** Once GPAS broadcasts the on-chain enablement transactions for `cubic_check_verifier`, `veil_registry/v1`, and `veil_vote/v3` (when `vm/qfile` stops returning `package ... is not available`), execute Steps 3–6 directly against those live Onyx realms.
