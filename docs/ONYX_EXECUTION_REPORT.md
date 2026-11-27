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

## Step 1 — Active Dependency Verification

- **Network Check:** `https://rpc.onyx.testnets.gno.land:443/status` -> `network: onyx-1`, `height: 1445390`, `version: v1.8.0-rc.1`.
- **Wallet Balance:** `275,291,500 ugnot`.
- **On-Chain Source Integrity (`vm/qfile` vs local `main`, LF-normalized):**
  - `gno.land/p/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/groth16/v2/groth16.gno`: **Active & Exact Match** (`sha256: 700e35fc3a521ba979eb7bc7f9602308c9f10a1f881f5c32a54d55d4063d5917`).
  - `gno.land/p/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/semaphore/v2/semaphore.gno`: **Active & Exact Match** (`sha256: ebd9fcb6b3781f1363fafc4571d954ccfa51834d253ee93474cc9c01b8f0ee10`).

---

## Step 2 — RC2 Package Submissions (`onyx-1`)

| Package Path | Chain / Height | Tx Hash | Gas Used | Fee | GPAS Status |
| :--- | :---: | :--- | :---: | :---: | :--- |
| `gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/veil_vote/v3` | `onyx-1` / `1445403` | `n8gsscfoGHMyEy5p0yj9cDlg/M9Io5gWcH9Numi5cOw=` | `47,790,095` | `2,000,000 ugnot` | `pass` (`2026-11-27T07:06:54Z`), awaiting on-chain enable tx |
| `gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/veil_registry/v1` | `onyx-1` / `1445405` | `Z3nPuj8AoPVXdPOuWx3czo+Bk9dJQPhbVpNRsbJzJkw=` | `17,058,134` | `1,000,000 ugnot` | `pass` (`2026-11-27T07:07:00Z`), awaiting on-chain enable tx |
| `gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/cubic_check_verifier` | `onyx-1` / `1445406` | `2UQcV5zMkm+5F7RzJ2qzRtdvuaRzpkSkvP7icJPS3FQ=` | `6,480,793` | `1,000,000 ugnot` | `pass` (`2026-11-27T07:07:06Z`), awaiting on-chain enable tx |

---

## Steps 3–6 — Execution Status & Next Action

- **Attempted `MsgRun` (`gnokey maketx run`):** Rejected by `onyx-1` as expected (`std.UnauthorizedError: g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04 is not authorized to send MsgRun; see the vm run_submitters param`).
- **Next Action:** Once GPAS broadcasts the on-chain enablement transactions for `cubic_check_verifier`, `veil_registry/v1`, and `veil_vote/v3` (when `vm/qfile` stops returning `package ... is not available`), execute Steps 3–6 directly against those live Onyx realms.
