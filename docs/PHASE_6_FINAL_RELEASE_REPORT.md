# Veil Protocol — Phase 6 Final Release Report

**Date:** November 26, 2026  
**Directive:** Engineering Directive 007 (V1 Feature Freeze & Final Release Engineering)  
**Repository:** `https://github.com/n1shanthb/veil-protocol`  
**GitHub Actions CI Run:** `https://github.com/n1shanthb/veil-protocol/actions/runs/45826855505` (PASSED in `1m28s`)  
**Pinned Gno Toolchain:** `gnolang/gno` `v1.8.0-rc.1` (`fc79041f4cd1a7b3ed4b316dc5ac14162eb78730`)

---

## Separate Verdicts

| # | Dimension | Verdict | Rationale & Evidence |
| :--- | :--- | :--- | :--- |
| **1** | **Local engineering readiness** | **GO** | All 9 Gno packages (`groth16/v2`, `semaphore/v2`, `veil_verifier`, `veil_vote/v3`, `veil_registry/v1`, 4 Forge examples), 6 SDK tests, 2 Relayer tests, local `gnoland` `v3` & `veil_registry/v1` transactions, `local_e2e_relay.js`, and Chromium + Firefox Playwright E2E suites pass with 0 errors. |
| **2** | **AI-assisted adversarial security review** | **GO** | Complete AI-assisted adversarial security review (`94d9bbe2-93f6-491b-8ddf-a1343e9fc982`) documented in [`docs/SECURITY_AUDIT_REPORT.md`](./SECURITY_AUDIT_REPORT.md). All code-level High/Medium/Low findings resolved with regression tests (`HIGH-2..4`, `MEDIUM-1..5`, `LOW-2` in `veil_vote/v3`), and V1 trust/operational assumptions (`HIGH-1`, `MEDIUM-6`, `LOW-1`) explicitly documented. |
| **3** | **Clean-machine reproducibility** | **GO** | Executed clean Linux GitHub Actions workflow [`Veil Protocol CI`](https://github.com/n1shanthb/veil-protocol/actions/runs/45826855505) on `ubuntu-latest`: built `v1.8.0-rc.1` from source, verified `vk_depth10.json` SHA-256, passed all 9 Gno packages, passed Forge CLI smoke test, built/tested SDK, passed Relayer tests, and built Veil Studio. |
| **4** | **Public developer preview** | **READY FOR HOSTING** | `apps/web` Vite bundle (`481.57 kB` JS) and hardened `relayer/server.js` (restricted CORS, atomic persistence, `/ready`, bounded rate limits) are verified locally and documented in [`docs/HOSTING.md`](./HOSTING.md). No remote public domain is provisioned yet; must be labeled as a local/developer preview while Onyx remains in GPAS review. |
| **5** | **Onyx execution** | **NO-GO (Pending GPAS)** | `groth16/v2` (`1426060`) and `semaphore/v2` (`1426645`) remain in GPAS `review` (`in review queue`) on `https://gpas.latest.testnets.gno.land`. Until GPAS activates `groth16/v2` and `semaphore/v2`, `veil_vote/v3` and `veil_registry/v1` cannot execute on `onyx-1`. |
| **6** | **Hackathon submission readiness** | **GO** | Frozen V1 scope, 26+ clean conventional commits on GitHub, green Linux CI, full cryptographic & E2E evidence, comprehensive developer docs, and transparent disclosure of Onyx GPAS status. |

---

## Requirements-to-Evidence Matrix (Directive 007)

| Section | Requirement | Evidence |
| :--- | :--- | :--- |
| **A. Complete Independent Audit** | Retrieve & document every finding (severity, file/line, exploit, remediation, regression test, disposition) | [`docs/SECURITY_AUDIT_REPORT.md`](./SECURITY_AUDIT_REPORT.md) (`HIGH-1..4`, `MEDIUM-1..6`, `LOW-1..2`, `INFO`) |
| **B. Git Repo & Release Provenance** | `.gitignore`, `LICENSE` (MIT), lockfiles, secret scan clean, >=20 chunked conventional commits, GitHub repo | `https://github.com/n1shanthb/veil-protocol`, `LICENSE`, `.gitignore`, 26+ commits (`chore:`, `feat:`, `test:`, `ci:`, `docs:`) |
| **C. Final Immutable Source Freeze** | Frozen `groth16/v2`, `semaphore/v2`, `veil_vote/v3`, `veil_registry/v1` across Gno, SDK, Relayer, CLI, Web, Manifest | [`docs/RELEASE_MANIFEST.json`](./RELEASE_MANIFEST.json) (`veil-v1-rc1`) |
| **D. Reproducibility Gate** | 9 Gno packages, SDK, Forge, Relayer, Chromium & Firefox E2E, local txs, Registry, Proof Playground, **actual Linux GitHub Actions CI run** | CI Run: `https://github.com/n1shanthb/veil-protocol/actions/runs/45826855505` (PASS, `1m28s`); Local `veil_vote/v3` E2E: `local_e2e_relay.js` (`vPkOpZPNJg2dA4mQFb+bLU3bI5kJV2dC4j7ogErbbyw=`, `16,666,801` gas, height `426`), Chromium (`62EJxx/IPkS0e/xei6pGjacuj10zdsWyia/WlAjkmeE=`, `16,709,998` gas, height `429`), Firefox (PASS, 0 errors); `veil_registry/v1` `RegisterVerifier` (`kj/PEa3rHbMD7zYp79EFxXjGtmwuFjiScheptcYpQH8=`, `2,314,798` gas, height `436`) |
| **E. Onyx Activation & Deployment** | Check GPAS status, prepare escalation request, honest reporting | Queried `gpas.latest.testnets.gno.land` (`groth16/v2` & `semaphore/v2` in `review`); escalated in [`docs/ONYX_SUPPORT_REQUEST.md`](./ONYX_SUPPORT_REQUEST.md); no unverified Onyx execution claimed |
| **F. Public Hosting** | HTTPS, CORS, secrets, budget persistence, `/ready`, accurate status indicators | [`docs/HOSTING.md`](./HOSTING.md), `relayer/server.js` (`/ready`, `VEIL_ALLOWED_ORIGINS`, atomic `persistState`), `apps/web` (`vite build`) |
| **G. Developer Documentation** | Install, API, Architecture, Security, Privacy, Trusted Setup, Circuit Matrix, Deployment, Registry, Troubleshooting, Measured vs Estimated Perf | [`README.md`](../README.md), [`docs/QUICKSTART.md`](./QUICKSTART.md), [`docs/ARCHITECTURE_AND_API.md`](./ARCHITECTURE_AND_API.md), [`docs/SECURITY_AND_PRIVACY.md`](./SECURITY_AND_PRIVACY.md) |
| **H. Final Release Evidence** | Complete matrix & 6 separate verdicts | This document (`docs/PHASE_6_FINAL_RELEASE_REPORT.md`) |
