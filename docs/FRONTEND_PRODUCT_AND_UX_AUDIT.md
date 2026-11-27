# Veil Protocol — Frontend Product & UX Audit

**Audit Date:** 2026-11-27  
**Audit Type:** Read-Only. No code changes, no transactions executed.  
**Auditor Note:** Previous frontend audit documents have been discarded as unreliable per explicit instruction. This document is derived from direct source-code inspection of `apps/web/src/main.ts` (747 lines), `apps/web/src/veil-browser.ts` (328 lines), `relayer/server.js` (367 lines), `apps/web/src/style.css`, `apps/web/index.html`, `apps/web/package.json`, and live HTTP queries against the deployed services.

---

## 1. Environment Verified

| Resource | URL | Status |
|---|---|---|
| Studio (Vercel) | https://veil-studio-lyart.vercel.app | HTTP 200 |
| Relayer (Railway) | https://veil-relayer-production.up.railway.app | HTTP 200, `ready=true` |
| Onyx RPC | https://rpc.onyx.testnets.gno.land:443 | Reachable |
| Relayer daily budget | 10,000,000 ugnot | spentUgnotToday=0 |
| Git HEAD | `b7406a7` on `main` | — |

**All 5 Veil Protocol packages active on `onyx-1`** (confirmed by ticket-0183 "remi" response):

| Package | Height | Status |
|---|---|---|
| `groth16/v2` | 1426060 | Active |
| `semaphore/v2` | 1426645 | Active |
| `veil_vote/v3` | 1445403 | Active |
| `veil_registry/v1` | 1445405 | Active |
| `cubic_check_verifier` | 1445406 | Active |

---

## 2. Architecture Overview

Veil Studio is a **single-page application** with zero backend dependencies beyond the hosted relayer for vote submission. The build system is Vite + TypeScript. There is no React, Vue or Angular — the entire UI is vanilla TypeScript rendering raw HTML strings into a single `<div id="app">` via `innerHTML`. State is a single global `state` object; every mutation calls `render()` which replaces the full DOM.

**Dependencies (package.json):**
- `@semaphore-protocol/group@4.13.0`
- `@semaphore-protocol/identity@4.13.0`
- `@semaphore-protocol/proof@4.13.0`
- `ethers@^6.13.0` (for keccak256)
- `snarkjs` (bundled via vite-plugin-node-polyfills)

**No SSR, no API proxy, no auth layer.** All cryptographic operations execute in the browser.

---

## 3. Page Inventory

The application has **6 tabs** in a horizontal navigation bar. There is no sidebar, no modal system, no settings page, and no routing beyond tab switching. Tab state is in-memory only — refreshing the page resets everything.

---

### Tab 1: Veil Vote (Showcase)

**Purpose:** End-to-end anonymous voting demonstration using Semaphore v4 proofs. Intended for external developers evaluating Veil's ZK capabilities against a live Onyx testnet.

**Sub-sections:**

#### Section 1 — Local Semaphore v4 Identity (Card)

| Element | Type | Actual Behavior | Status |
|---|---|---|---|
| "Identity Seed / Secret (Local Only)" | `<input>` text | Pre-filled empty string. User can type any string here. | LIVE_BROWSER |
| "Restore Identity" button | `<button>` | Calls `new Identity(inputValue)` — deterministic Semaphore identity from seed string. Updates `state.identity`. | LIVE_BROWSER |
| "Generate Random Identity" button | `<button>` | Calls `new Identity()` with no args (random). Sets `state.identitySecret = "random-ephemeral-identity"`. | LIVE_BROWSER |
| Identity Commitment (Hex) `<pre>` | Display | 64-char hex of `state.identity.commitment`. Recalculated on render. | LIVE_BROWSER |
| "REGISTERED IN GROUP #1" / "NOT IN GROUP #1" badge | Display | Green if `isMember = grp.members.includes(identity.commitment.toString())`. | LIVE_BROWSER (Local) / LIVE_ONYX (Onyx mode, after sync) |

> [!IMPORTANT] In Onyx mode: `grp.members` is populated from the live `veil_vote/v3.GetPollCommitmentsPaged()` call. The group snapshot for Poll #1 is **frozen** at 3 members (`onyx-voter-1`, `onyx-voter-2`, `onyx-voter-3` seeds). Any new identity created by a visitor will show "NOT IN GROUP #1" and cannot vote in Poll #1 without an admin `AddMember` + `PublishRoot` on-chain transaction.

#### Section 2 — Group #1 & LeanIMT Root (Card)

| Element | Type | Actual Behavior | Status |
|---|---|---|---|
| "Reconstructed Merkle Root (Hex)" `<pre>` | Display | Computed by `new Group(members).root` in browser from loaded commitments. | LIVE_BROWSER |
| "Registered Commitments" `<pre>` | Display | Lists all commitment hex values in the current group. In Local mode: 3 random ephemeral identities. In Onyx mode after sync: 3 on-chain commitments. | LIVE_BROWSER / LIVE_ONYX |

#### Section 3 — Cast Anonymous Vote (Card)

| Element | Type | Actual Behavior | Status |
|---|---|---|---|
| Poll dropdown `<select>` | Select | In Local mode: shows Poll #42 and #43 (synthetic). In Onyx mode (after sync): prepends "Onyx Live Poll #1". Changing selection updates `state.selectedPollId`. | LIVE_BROWSER (Local) / LIVE_ONYX (Onyx) |
| Vote option dropdown `<select>` | Select | Populates from selected poll's options array. Poll #1 options: ["Yes", "No"]. | LIVE_BROWSER |
| "Generate Semaphore Proof (Browser-Local)" button | `<button class="primary">` | Calls `generateProof()` from `@semaphore-protocol/proof`. Fetches WASM/zkey from CDN (PSE). Takes 2–4 seconds. Populates `state.lastVoteProof`. | LIVE_BROWSER |
| "Submit Vote (Browser-Local State)" button | `<button>` (conditional) | Only appears after proof generated. Updates in-memory tally. No network call. | LIVE_BROWSER |
| "Simulate Vote (Browser-Local)" button | `<button>` (conditional, Onyx mode) | Same as above — browser-local only despite Onyx mode label. No relay call. | LIVE_BROWSER |
| "Submit On-Chain via Relayer (Onyx)" button | `<button>` (conditional) | POST to `${relayerUrl}/api/relay/vote`. Calls Railway relayer which signs with `gnokey` and submits to `veil_vote/v3.Vote()`. | RAILWAY_DEPENDENT |
| "Sync Live Onyx State" button | `<button class="secondary">` | Calls `refreshOnyxStatus()`: fetches `/status`, `veil_registry/v1.ListVerifiersPaged()`, `veil_vote/v3.GetPollTally()`, `veil_vote/v3.GetPollCommitmentsPaged()`. | LIVE_ONYX |
| Vote status `<div class="status-box">` | Display | Shows last action result string. | LIVE_BROWSER |
| Last Tx Hash link | `<div>` conditional | Appears after relayer submit. Links to `https://onyx.gno.land/r/.../veil_vote/v3` (realm page, not tx-specific). | PARTIAL |
| Live Onyx Poll #1 status box | Display | Shows Yes/No tallies, member count, reconstructed root from last Onyx sync. Shows "syncing..." until first sync. | LIVE_ONYX (after sync) |
| Current Poll Tallies table | Table | In Local mode: in-memory tallies. In Onyx mode: populated from live Onyx sync. | LIVE_BROWSER / LIVE_ONYX |
| Generated Proof Artifacts `<pre>` | Display (conditional) | Shows nullifier hex, `verifyProof` result, and a `gnokey maketx call` CLI command for manual submission. | LIVE_BROWSER |

#### Section 4 — Group & Poll Administration (Card)

| Element | Type | Actual Behavior | Status |
|---|---|---|---|
| "Register Commitment Hex" input | `<input>` | Pre-filled with current identity's commitment hex. | LIVE_BROWSER |
| "Add Member & Publish Root" button | `<button class="secondary">` | In **Local Dev mode only**: modifies `state.groups[0].members` in browser memory. Does NOT call Onyx. No on-chain effect. | LOCAL_ONLY |
| "Create New Poll Title / Options CSV" inputs | `<input>` × 2 | Pre-filled with "Proposal #44" / "Abstain,For,Against". | LIVE_BROWSER |
| "Create Poll" button | `<button class="secondary">` | In **Local Dev mode only**: creates poll in browser-local `state.polls` array. No Onyx interaction. | LOCAL_ONLY |
| Admin status `<div>` | Display | Shows last admin action result. | LIVE_BROWSER |

> [!WARNING] The "Admin Panel" label is misleading. Despite appearing under "Group & Poll Administration", these buttons have **no on-chain authority**. In Local mode they mutate browser state only. In Onyx mode they still only mutate local state — there is no path for a visitor to actually add themselves to the on-chain group or create an on-chain poll.

**Global header controls (Vote tab context):**

| Element | Actual Behavior | Status |
|---|---|---|
| Mode badge ("MODE: LOCAL DEV" / "MODE: ONYX TESTNET") | Toggles `state.mode`. Yellow in local, green in Onyx. | LIVE_BROWSER |
| "RPC: …" badge | Shows `state.onyxHeight` — network ID and block height from last Onyx sync. | LIVE_ONYX (after sync) |
| "Switch to Onyx Mode" / "Switch to Local Dev Mode" button | Toggles mode, selects Poll #1 in Onyx mode if synced. | LIVE_BROWSER |

---

### Tab 2: Circuit Library

**Purpose:** Reference table of ZK circuits supported by Veil. Intended for developers evaluating what circuits they can use.

**Single card — static HTML table:**

| Column | Content | Classification |
|---|---|---|
| Circuit | Name of circuit file | STATIC_REAL_DATA |
| Curve / Protocol | BN254 / Groth16 for all | STATIC_REAL_DATA |
| Public Inputs | Input count and labels | STATIC_REAL_DATA |
| Setup Provenance | "Dev-Only (pot12)" or "Ceremony-Backed (PSE)" | STATIC_REAL_DATA |
| Verified GnoVM Gas | Gas figures from actual on-chain executions | STATIC_REAL_DATA |

**Listed circuits (4 total):**

| Circuit | WASM | zkey | VK | Source | Status |
|---|---|---|---|---|---|
| `multiplier.circom` | ✅ `multiplier_js/multiplier.wasm` (34 KB) | ✅ `multiplier_final.zkey` | ✅ `verification_key.json` | ✅ `circuits/multiplier.circom` | Complete artifacts in repo |
| `sum_of_squares.circom` | ✅ `sum_of_squares_js/*.wasm` (34 KB) | ✅ `sum_of_squares_final.zkey` | ✅ `verification_key.json` | ✅ `circuits/sum_of_squares.circom` | Complete artifacts in repo |
| `semaphore-10 (v4.13.0)` | ✅ Fetched at proof-time from PSE CDN | ✅ Fetched at proof-time from PSE CDN | ✅ `circuits/semaphore/vk_depth10.json` | External (PSE) | Artifacts NOT in repo; CDN-dependent |
| `external/cubic_check.circom` | ✅ `cubic_check_js/cubic_check.wasm` (34 KB) | ✅ `cubic_check_final.zkey` | ✅ `verification_key.json` | ✅ `circuits/external/cubic_check.circom` | Complete artifacts in repo |

**Missing from Circuit Library tab:**
- No download links for any WASM/zkey/VK artifacts
- No "Open in Forge" or "Open in Playground" action links
- No proof-generation capability from this tab
- The semaphore-10 row gives no indication that artifacts are CDN-fetched (not local)
- No link to the PSE ceremony page for the semaphore-10 trust basis

**Scores:**
- Visual Quality: 6/10 — clean table, appropriate density
- Functional Completeness: 2/10 — no downloads, no interactive proof generation
- Usability: 4/10 — readable reference, but zero actionability
- Developer Experience: 3/10 — developer learns what exists but cannot use it from this UI
- Production Readiness: 5/10 — accurate data, honest provenance labels

---

### Tab 3: Forge

**Purpose:** Convert a snarkjs Groth16 `verification_key.json` into a deployable Gno verifier package (`.gno` file). Intended for developers who have compiled their own Circom circuits.

**Single card:**

| Element | Type | Actual Behavior | Status |
|---|---|---|---|
| "Target Gno Package Path" | `<input>` | Pre-filled with `gno.land/r/g1c3m9.../custom_verifier`. Editable. Used as `pkgPath` in generated source. | LIVE_BROWSER |
| `verification_key.json` | `<textarea>` | Paste JSON. No file-upload `<input type="file">`. | LIVE_BROWSER |
| "Validate & Generate Gno Verifier" button | `<button class="primary">` | Calls `validateAndConvertVK()` + `generateGnoVerifierSource()` — entirely browser-local. Validates BN254 field canonicity, converts G2 to EIP-197 order, produces `.gno` source. | LIVE_BROWSER |
| "Export Deployable Bundle (.json)" button | `<button class="secondary">` (conditional) | Only appears after successful generation. Creates a Blob containing `{"gnomod.toml": "...", "verifier.gno": "..."}` and triggers download as `veil-verifier-package.json`. | LIVE_BROWSER |
| Error display | `<div class="status-box">` | Shows validation errors with friendly messages. | LIVE_BROWSER |
| Generated `verifier.gno` | `<pre>` (conditional) | Displays the full Gno source code after generation. | LIVE_BROWSER |

**Key observations:**
- The VK validation is thorough: checks `protocol === "groth16"`, `curve === "bn128"|"bn254"`, IC array presence, `nPublic` match, field element canonicity (< BN254 p)
- The generated code imports `groth16/v2` from the live Onyx package path — correct
- The export bundle uses `gnomod.toml` format, which may need manual renaming to `gno.mod` depending on Gno toolchain version
- **No deployment path in browser** — the generated code must be deployed via `gnokey maketx addpkg` CLI. No browser transaction submission exists in Forge.
- **No file upload input** — users must paste the JSON manually. For large VK files (multiplier VK is ~2.9 KB, semaphore VK is ~3.7 KB) this is manageable but awkward for less experienced developers.

**Scores:**
- Visual Quality: 6/10
- Functional Completeness: 7/10 — the core generation workflow is real and correct
- Usability: 5/10 — no file upload is a friction point; generated code has no copy button
- Developer Experience: 6/10 — the output is immediately usable via CLI; accurate field validation
- Production Readiness: 7/10 — real browser-local ZK infrastructure, no mocks

---

### Tab 4: Proof Playground

**Purpose:** Import snarkjs proof artifacts, run browser-side `snarkjs.groth16.verify()`, inspect EIP-197 Gno encodings, and generate CLI commands. Intended for developers debugging proofs before on-chain submission.

**Single card:**

| Element | Type | Actual Behavior | Status |
|---|---|---|---|
| `verification_key.json` | `<textarea>` | Paste JSON. No file upload. | LIVE_BROWSER |
| `proof.json` | `<textarea>` | Paste JSON `{pi_a, pi_b, pi_c}`. | LIVE_BROWSER |
| `public.json` | `<textarea>` | Paste JSON array of public input strings. | LIVE_BROWSER |
| "Verify in Browser (snarkjs) & Encode for Gno" button | `<button class="primary">` | Runs `snarkjs.groth16.verify(vkObj, pubObj, proofObj)` — real browser-side cryptographic verification. Also runs `validateAndConvertVK` + `validateAndConvertProof` + `encodePublicInputs`. | LIVE_BROWSER |
| Verification badge | `<div>` (conditional) | "BROWSER SNARKJS VERIFICATION: VALID" (green) or "INVALID" (red). | LIVE_BROWSER |
| Verification & Gno Serialization Output | `<pre>` (conditional) | Shows snarkjs result, full A/B/C hex encodings, public inputs, `veil test` CLI command, and `gnokey maketx call` Onyx command. | LIVE_BROWSER |
| Error display | `<div>` | Shows parsing/validation errors. | LIVE_BROWSER |

**Key observations:**
- Playground **does not submit proofs on-chain** — it only verifies locally and generates CLI commands
- The `gnokey maketx call` command in the output uses `<realm>` as a placeholder — developer must substitute the correct realm path
- The `node cli/veil.js test` command requires the CLI to be installed locally — not explained in the UI
- No direct link from "open in Playground" from Circuit Library or Forge — the developer must copy-paste JSON between tabs
- **No file upload inputs anywhere** in Playground — 100% paste-only

**Scores:**
- Visual Quality: 5/10
- Functional Completeness: 7/10 — browser verification is real and accurate
- Usability: 4/10 — three large textareas with no helper, no file drag-drop, no "load example" button
- Developer Experience: 5/10 — powerful but discoverable only by experienced developers
- Production Readiness: 6/10 — the core function is production-quality; UX is rough

---

### Tab 5: Deployments

**Purpose:** Show the live deployment status of all Veil Protocol packages on Onyx. Also shows the live on-chain Verifier Registry records.

**Single card — two sections:**

#### Onyx Testnet Deployments table (5 rows)

| Column | Content | Classification |
|---|---|---|
| Package Path | Hyperlinks to `https://onyx.gno.land/{p,r}/...` | STATIC_REAL_DATA |
| Role | "Core Verifier", "Primitives", "Vote Realm", etc. | STATIC_REAL_DATA |
| Height | Exact deployment block heights (1426060–1445406) | STATIC_REAL_DATA |
| Tx Hash | Base64 encoded transaction hashes | STATIC_REAL_DATA |
| Gas Used | Exact gas figures from deployment | STATIC_REAL_DATA |
| Status | Hardcoded "**Active**" for all 5 | STATIC_REAL_DATA |

> [!NOTE] The "Status" column is **not dynamically queried** — it is hardcoded "Active" in the HTML template. If a package were paused or deprecated, this table would still show "Active". A live query via `vm/qfile` would be needed for genuine runtime status.

#### Live On-Chain Registry section

| Element | Actual Behavior | Status |
|---|---|---|
| `<pre>` block | Shows `state.onyxRegistryRecords` — populated by `fetchOnyxRegistryRecords()` which calls `veil_registry/v1.ListVerifiersPaged(0, 20)` | LIVE_ONYX (after Sync) |
| Fallback message | "No records loaded yet (click Sync Live Onyx State on Vote tab)." | — |

> [!IMPORTANT] The registry sync is triggered from the **Vote tab**, not from the Deployments tab. There is no "Refresh" button on the Deployments tab itself. A developer navigating directly to Deployments will see "No records loaded yet" until they go to Vote tab and click "Sync Live Onyx State" first. This is a discoverability failure.

**Explorer links:** All 5 package links go to `https://onyx.gno.land/{p,r}/...` — these are live Onyx explorer pages. The `onyx.gno.land` explorer was confirmed accessible in prior E2E tests.

**GPAS status:** Not shown. The table does not expose GPAS approval metadata. The hardcoded Tx Hash values are deployment hashes, not GPAS ticket IDs.

**Scores:**
- Visual Quality: 7/10 — clean table with real data
- Functional Completeness: 4/10 — registry is live but requires cross-tab action; status is static
- Usability: 4/10 — no refresh button on this tab; registry section placement is confusing
- Developer Experience: 5/10 — accurate deployment evidence but passive
- Production Readiness: 5/10 — real data, real links, but synthetic "Active" status

---

### Tab 6: Primitives

**Purpose:** Code reference showing how to use `semaphore/v2` Gno package primitives. Intended for developers building their own Gno applications using Veil primitives.

**Single card — static code display:**

| Element | Type | Actual Behavior | Status |
|---|---|---|---|
| `<pre>` import block | Static Gno code sample | Shows `import` statements and `semaphore.HashToField`, `DomainScopeFull`, `VerifyAndConsume` usage | STATIC_REAL_DATA |

> [!NOTE] The Primitives tab references `semaphore/v1` in the code sample (`import "gno.land/p/.../semaphore/v1"`) but the deployed package is `semaphore/v2`. This is a **documentation error** — the import path is wrong.

**There are no interactive elements on this tab.** It is purely a code snippet display. No API query, no rendering of live contract state.

**Scores:**
- Visual Quality: 5/10
- Functional Completeness: 1/10 — documentation only, no interactivity
- Usability: 3/10 — single static code block with wrong import path
- Developer Experience: 3/10 — a docs page with an incorrect import is worse than no docs
- Production Readiness: 2/10 — the wrong version label is misleading

---

## 4. Critical Product Questions

### Q: Can a completely new visitor open Studio, generate an identity, become eligible, and cast a vote without developer intervention?

**Answer: NO.**

The voting journey is broken for new users in Onyx mode for the following concrete reasons:

**Blocker 1 — Frozen group membership:**
- The group snapshot for Poll #1 contains exactly 3 commitment hashes (from seeds `onyx-voter-1`, `onyx-voter-2`, `onyx-voter-3`)
- This snapshot was frozen at the time `PublishRoot` was last called on-chain
- A new visitor generating a fresh identity will produce a commitment not in this snapshot
- The `generateProof()` call will fail with "not a member of the group" because the Merkle proof cannot be constructed for a commitment absent from the group

**Blocker 2 — No on-chain admin path in browser:**
- The "Add Member & Publish Root" button in the Admin Panel **only modifies browser-local state**
- It does NOT submit `AddMember()` or `PublishRoot()` to `veil_vote/v3` on-chain
- An on-chain `AddMember` requires a `gnokey maketx call` transaction signed by the authorized `RootPublisher` address
- The `RootPublisher` is the deployer address (`g1c3m9...`) — only the project owner can expand group membership
- There is no browser UI that wraps the `AddMember` + `PublishRoot` on-chain flow

**Blocker 3 — All 3 existing members have spent their nullifiers:**
- Votes from `onyx-voter-1`, `onyx-voter-2`, `onyx-voter-3` have been submitted on-chain for Poll #1 (tallies: Yes=2, No=1)
- The Semaphore nullifier for each is marked as used in `veil_vote/v3`
- Even if a developer knows the seed strings (`onyx-voter-1`, etc.) and restores those identities, they will receive "nullifier already used" from the relayer
- The existing 3 members have permanently exhausted their voting eligibility for Poll #1

**Conclusion:** The Veil Vote showcase is a closed system for external users. It demonstrates a completed proof of concept but cannot be meaningfully interacted with by new visitors.

### Q: Which operations require administrator credentials or CLI?

| Operation | Required | Available in Browser UI |
|---|---|---|
| Generate identity | None | ✅ |
| Reconstruct Merkle root | None | ✅ |
| Generate Semaphore proof | None (PSE CDN) | ✅ |
| Submit via relayer | None | ✅ |
| Add member to group (on-chain) | RootPublisher private key + gnokey CLI | ❌ |
| Publish new root (on-chain) | RootPublisher private key + gnokey CLI | ❌ |
| Create new poll (on-chain) | Deployer private key + gnokey CLI | ❌ |
| Register verifier in Registry | Publisher address + gnokey CLI | ❌ |
| Deploy new verifier realm | Any address + gnokey CLI + GPAS approval | ❌ |

---

## 5. Design Assessment — Overall

### Visual Design
The UI uses a consistent obsidian/dark theme (`--bg-obsidian: #09090b`) with a monospace-accented aesthetic appropriate for a ZK developer tool. Typography is clean (Inter for prose, JetBrains Mono for code). Color palette is disciplined: green for OK, yellow for warning, red for error.

However, the application is **visually indistinguishable from an engineering prototype**:
- No logo beyond an SVG "V" mark (literally an Angular logo placeholder)
- No hero section, tagline, or value proposition for first-time visitors
- No visual hierarchy between primary product features and experimental utilities
- All 6 tabs have equal visual weight — Veil Vote and Primitives feel like the same category of content
- No empty states with helpful guidance — empty textareas have small placeholder text only
- No loading states beyond a text string in `state.voteStatus`

### Information Architecture Issues
1. **Admin Panel is exposed to all users** — there is no visual distinction between user-facing and admin controls
2. **Registry sync lives in Vote tab** — Deployments tab content requires action from a different tab
3. **No navigation context** — first-time visitors cannot understand the relationship between Forge → Playground → Deployments → Vote
4. **Local Dev vs Onyx mode is a toggle, not a tab** — the mode fundamentally changes what every piece of data means, but visually it's a small badge in the top-right corner

---

## 6. Security & Privacy UX Observations

| Issue | Severity | Detail |
|---|---|---|
| Identity secret field is a plain-text `<input>` | Medium | The "Identity Seed / Secret (Local Only)" label is reassuring, but the input type is `text` not `password`. On shared screens or screen recordings, this secret is visible. |
| "random-ephemeral-identity" label misleading | Low | Clicking "Generate Random Identity" sets `state.identitySecret = "random-ephemeral-identity"` — this is the displayed label string, not the actual secret. The actual secret is the internally generated random bytes, which are never shown. This could confuse a user who thinks "random-ephemeral-identity" is their seed. |
| Admin panel not gated | Low | The admin panel (Add Member, Create Poll) is visible to all users. In Local mode this is harmless. In Onyx mode these buttons silently succeed on local state only. Confusion risk is low but presence of admin controls creates false impression of authority. |
| Relayer URL hardcoded in env var | Positive | `VITE_RELAYER_URL` is set at build time — the production build always points to the Railway relayer. No user-facing input for relayer URL. |
| No wallet connection | Positive | The UI requires no MetaMask or wallet. All signing is done server-side by the relayer. This eliminates a significant attack surface. |
| Tx hash link goes to realm page, not specific tx | Low | The `onyxLastTxHash` link goes to `https://onyx.gno.land/r/.../veil_vote/v3` — the realm viewer — not to a transaction-specific URL. The user cannot verify the specific transaction from the UI. |

---

## 7. Railway Relayer Dependency Audit

### Current relayer health (as of audit):
- Status: `200 OK`, `ready=true`
- Chain: `onyx-1`
- Daily budget: 10,000,000 ugnot
- Spent today: 0 ugnot
- Pending reconciliations: 0

### Features requiring a healthy relayer:

| Feature | Without Relayer | With Relayer |
|---|---|---|
| Generate identity | ✅ Unaffected | ✅ |
| Generate proof | ✅ Unaffected | ✅ |
| "Submit On-Chain via Relayer" button | ❌ Network error | ✅ Submits to Onyx |
| Sync Live Onyx State | ✅ Unaffected (direct RPC) | ✅ |
| View deployments table | ✅ Static data | ✅ |
| View registry records | ✅ Direct RPC | ✅ |

**Conclusion:** The relayer is required only for the final vote-submission step. All other features are either LIVE_BROWSER (pure client-side) or LIVE_ONYX (direct RPC).

---

## 8. Screenshot Evidence

Screenshots are captured by the browser audit agent and stored at:
`docs/frontend-audit/screenshots/`

| File | Description |
|---|---|
| `vote_desktop_default.png` | Vote tab, Local Dev mode, default state |
| `vote_desktop_onyx_mode.png` | Vote tab, Onyx mode after toggle |
| `vote_desktop_proof_generated.png` | Vote tab after proof generation |
| `circuits_desktop_default.png` | Circuit Library tab |
| `forge_desktop_default.png` | Forge tab, empty state |
| `forge_desktop_vk_pasted.png` | Forge tab after VK pasting |
| `playground_desktop_default.png` | Proof Playground tab |
| `deployments_desktop_default.png` | Deployments tab |
| `primitives_desktop_default.png` | Primitives tab |
| `*_tablet_default.png` | Tablet viewport (768px) variants |
| `*_mobile_default.png` | Mobile viewport (375px) variants |

---

## 9. Priority Issues

| Priority | Issue | Tab | Impact |
|---|---|---|---|
| P0 | New users cannot vote — frozen group snapshot | Vote | Product-breaking for the core showcase |
| P0 | Admin panel is local-only despite Onyx mode — no on-chain path for new members | Vote | Misleading; core user journey blocked |
| P1 | Primitives tab references `semaphore/v1` but deployed package is `semaphore/v2` | Primitives | Documentation correctness |
| P1 | Deployments tab registry requires cross-tab Sync action | Deployments | Poor discoverability |
| P1 | Deployments "Status" column is hardcoded "Active" — not dynamically queried | Deployments | Misleading if packages ever become unavailable |
| P1 | Tx hash link goes to realm page, not specific transaction | Vote | Cannot verify specific on-chain vote from UI |
| P2 | No file upload anywhere — all JSON must be pasted | Forge, Playground | Developer friction |
| P2 | No "Open in Forge" / "Open in Playground" links from Circuit Library | Circuits | Discovery gap |
| P2 | No copy-to-clipboard on generated Gno code | Forge | Usability |
| P2 | identitySecret display label "random-ephemeral-identity" is confusing | Vote | Minor UX confusion |
| P3 | No loading spinner during proof generation (3–4 seconds) | Vote | UX polish |
| P3 | No toast/notification system — status updates are inline text | All | UX polish |
| P3 | No empty state guidance for first-time visitors | All | Onboarding |
| P3 | No copy button for proof artifacts `<pre>` block | Vote | Usability |

---

## 10. Artifact Integrity Check Status

The `verifyArtifactIntegrity()` function exists in `veil-browser.ts` (lines 290–309) and validates WASM magic header (`\x00asm`) and zkey magic header (`zkey`). The UI shows `state.artifactCheckStatus = "Not checked"` by default — this check must be manually triggered. No button to trigger artifact verification is present in the current UI beyond what happens implicitly during proof generation.

---

*Audit completed: 2026-11-27. Source: `apps/web/src/main.ts` v747, `apps/web/src/veil-browser.ts` v328, `relayer/server.js` v367, live HTTP queries against Railway and Onyx RPC.*
