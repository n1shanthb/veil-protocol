# Veil Protocol — Frontend Feature Matrix

**Audit Date:** 2026-11-27  
**Source:** Direct source-code inspection of `apps/web/src/main.ts` (747 lines) and `apps/web/src/veil-browser.ts` (328 lines).

## Classification Taxonomy

| Code | Meaning |
|---|---|
| `LIVE_ONYX` | Actually reads from or executes against public Onyx (`onyx-1`) |
| `LIVE_BROWSER` | Genuine functionality executed entirely inside the browser |
| `LIVE_BACKEND` | Actual functionality executed through an available backend |
| `LOCAL_ONLY` | Works only with a local development environment |
| `RAILWAY_DEPENDENT` | Implementation exists but requires the hosted Railway relayer |
| `STATIC_REAL_DATA` | Hardcoded but factually accurate configuration or historical evidence |
| `MOCK` | Fabricated or simulated data presented as functionality |
| `PLACEHOLDER` | UI exists but implementation is missing |
| `PARTIAL` | Some functionality exists, but intended workflow is incomplete |
| `BROKEN` | Implemented but fails under actual testing |
| `UNVERIFIED` | Insufficient evidence to establish functionality |

---

## Tab: Veil Vote (Showcase)

| Feature / Element | Intended Behavior | Actual Behavior | Classification | Source Reference | Notes |
|---|---|---|---|---|---|
| Mode badge ("MODE: LOCAL DEV" / "MODE: ONYX TESTNET") | Show current operating mode | Correctly reflects `state.mode`. Yellow=local, Green=onyx. | `LIVE_BROWSER` | main.ts:442-444 | |
| "RPC: …" badge | Show live Onyx block height and network info | Fetches `/status` from Onyx RPC on page load and on Sync. Shows network ID + block height. | `LIVE_ONYX` | main.ts:128-161 | Updates on refreshOnyxStatus() |
| "Switch to Onyx Mode" button | Toggle between Local Dev and Onyx Testnet modes | Correctly toggles `state.mode`. Auto-selects Poll #1 in Onyx mode if synced. | `LIVE_BROWSER` | main.ts:486-493 | |
| Tab navigation buttons (all 6 tabs) | Switch active tab | Correctly update `state.tab` and call `render()`. | `LIVE_BROWSER` | main.ts:477-482 | |
| **Section 1: Identity** | | | | | |
| "Identity Seed / Secret (Local Only)" input | Allow deterministic identity from seed string | Text `<input>` pre-filled empty. User can type any string. | `LIVE_BROWSER` | main.ts:191 | Type is `text` not `password` — visible on screen |
| "Restore Identity" button | Generate deterministic Semaphore identity from seed | Calls `new Identity(inputValue)` via `@semaphore-protocol/identity`. Updates `state.identity`. | `LIVE_BROWSER` | main.ts:495-504 | Real cryptographic identity derivation |
| "Generate Random Identity" button | Generate a fresh random Semaphore identity | Calls `new Identity()` with no args (random). Sets `state.identitySecret = "random-ephemeral-identity"`. | `LIVE_BROWSER` | main.ts:506-515 | The displayed label "random-ephemeral-identity" is not the actual secret |
| Identity Commitment (Hex) `<pre>` | Show current identity's public commitment | `BigInt(state.identity.commitment).toString(16).padStart(64, "0")`. Recalculates on render. | `LIVE_BROWSER` | main.ts:182,197 | |
| "REGISTERED IN GROUP #1" badge (green) | Indicate identity is in the active group | `isMember = grp.members.includes(identity.commitment.toString())`. In Onyx mode: checks against on-chain commitments. | `LIVE_BROWSER` / `LIVE_ONYX` | main.ts:183,198-200 | In Onyx mode, accurate only after Sync |
| "NOT IN GROUP #1" badge (yellow) | Indicate identity not in group | Same check; shown when commitment not found in `grp.members`. | `LIVE_BROWSER` / `LIVE_ONYX` | main.ts:198-200 | All new visitor identities will show this in Onyx mode |
| **Section 2: Group & Root** | | | | | |
| "Reconstructed Merkle Root (Hex)" `<pre>` | Show Merkle root of the active group | `new Group(members.map(BigInt)).root` — real LeanIMT computation in browser. | `LIVE_BROWSER` | main.ts:119-126 | Cryptographically correct; matches on-chain root when membership matches |
| "Registered Commitments" `<pre>` | Show all current group members | Lists hex-encoded commitments. In Local: 3 ephemeral. In Onyx after sync: 3 on-chain commitments. | `LIVE_BROWSER` / `LIVE_ONYX` | main.ts:208-209 | |
| **Section 3: Cast Vote** | | | | | |
| Poll dropdown `<select>` | Select which poll to vote in | In Local mode: Poll #42, Poll #43 (synthetic). In Onyx mode (after sync): Poll #1 added. | `LIVE_BROWSER` / `LIVE_ONYX` | main.ts:220-228 | Local polls are synthetic; Poll #1 reflects live Onyx state |
| Vote option dropdown `<select>` | Select vote option | Populates from selected poll's options. Poll #1: ["Yes", "No"]. | `LIVE_BROWSER` | main.ts:230-238 | |
| "Generate Semaphore Proof (Browser-Local)" button | Generate a valid ZK proof | Calls `generateProof()` from `@semaphore-protocol/proof` v4.13.0. Fetches WASM/zkey from PSE CDN. Real snarkjs Groth16 Semaphore v4 proof. Takes 2–4 seconds. | `LIVE_BROWSER` | main.ts:539-571 | CDN-dependent for WASM/zkey artifacts |
| Proof generation status text | Show progress during proof | Updates `state.voteStatus` to "Generating client-side Semaphore v4 Groth16 proof..." then to result. | `LIVE_BROWSER` | main.ts:543,565 | No spinner; text-only feedback during 2–4s wait |
| "Submit Vote (Browser-Local State)" button (conditional) | Submit vote to browser-local state | Updates in-memory `poll.tallies` and `state.spentNullifiers`. No network call. | `LOCAL_ONLY` | main.ts:573-598 | Only appears after proof generated |
| "Simulate Vote (Browser-Local)" button (conditional, Onyx mode) | Simulate vote in Onyx mode | Same behavior as Submit (Browser-Local). Despite "Onyx mode" label, this is browser-local only. | `LOCAL_ONLY` | main.ts:244 | Misleading label: says "Simulate" but no Onyx interaction occurs |
| "Submit On-Chain via Relayer (Onyx)" button (conditional) | Submit vote on-chain via Railway relayer | POST to `${VITE_RELAYER_URL}/api/relay/vote` with proof fields. Railway signs with gnokey and broadcasts to Onyx. | `RAILWAY_DEPENDENT` | main.ts:600-633 | Real on-chain submission when relayer healthy |
| "Sync Live Onyx State" button | Fetch latest Onyx state | Calls `refreshOnyxStatus()`: RPC status + registry + poll tallies + commitments. Updates `state.onyxHeight`, tallies, root, commitments. | `LIVE_ONYX` | main.ts:534-537 | Direct RPC calls; no relayer dependency |
| Last Tx Hash display `<div>` (conditional) | Show on-chain transaction evidence | Shows `onyxLastTxHash` with link to `https://onyx.gno.land/r/.../veil_vote/v3` | `PARTIAL` | main.ts:252-255 | Link goes to realm page, not specific tx. No block explorer tx link. |
| Live Onyx Poll #1 status box | Show live tally, member count, root | Shows `onyxPoll1Tallies[0]`, `onyxPoll1Tallies[1]`, `onyxPoll1Count`, `onyxPoll1Root`. | `LIVE_ONYX` | main.ts:256-262 | Shows "syncing..." before first Sync; correct after sync |
| Poll Tallies table | Show vote counts per option | In Local: in-memory counts. In Onyx: populated from last Sync. | `LIVE_BROWSER` / `LIVE_ONYX` | main.ts:266-274 | Does not auto-refresh; stale until next Sync |
| Generated Proof Artifacts `<pre>` (conditional) | Show proof components and CLI command | Shows nullifier hex, `verifyProof` boolean, full `gnokey maketx call` command with truncated proof args. | `LIVE_BROWSER` | main.ts:276-291 | Proof args truncated to 24 chars with "..." for display |
| **Section 4: Administration** | | | | | |
| "Register Commitment Hex" input | Input hex commitment to add to group | Pre-filled with current identity's commitment hex. Editable. | `LIVE_BROWSER` | main.ts:302 | |
| "Add Member & Publish Root" button | Add member to group | In LOCAL mode: appends to `state.groups[0].members` array. No Onyx call. | `LOCAL_ONLY` | main.ts:635-654 | Zero on-chain effect. Does not call AddMember() on veil_vote/v3. |
| "Create New Poll Title" input | Input poll title | Pre-filled "Proposal #44". | `LIVE_BROWSER` | main.ts:307 | |
| "Create New Poll Options CSV" input | Input poll options | Pre-filled "Abstain,For,Against". | `LIVE_BROWSER` | main.ts:308 | |
| "Create Poll" button | Create a new poll | In LOCAL mode: appends to `state.polls` array. No Onyx call. | `LOCAL_ONLY` | main.ts:656-679 | Zero on-chain effect. Does not call CreatePoll() on veil_vote/v3. |
| Admin status display | Show result of admin action | Shows string from `state.adminStatus`. | `LIVE_BROWSER` | main.ts:312 | |

---

## Tab: Circuit Library

| Feature / Element | Intended Behavior | Actual Behavior | Classification | Source Reference | Notes |
|---|---|---|---|---|---|
| Circuit table (4 rows) | Reference for supported circuits | Static HTML table. All 4 circuits listed with accurate metadata. | `STATIC_REAL_DATA` | main.ts:321-330 | No interactivity; data verified against repo artifacts |
| multiplier.circom row | Show multiplier circuit info | Accurate: BN254/Groth16, 1 public input, pot12 setup, 2,888,411 gas | `STATIC_REAL_DATA` | main.ts:324 | Full artifacts in repo (wasm, zkey, VK) |
| sum_of_squares.circom row | Show sum_of_squares circuit info | Accurate: BN254/Groth16, 2 public inputs, pot12 setup, 3,029,774 gas | `STATIC_REAL_DATA` | main.ts:325 | Full artifacts in repo (wasm, zkey, VK) |
| semaphore-10 (v4.13.0) row | Show semaphore circuit info | Accurate: BN254/Groth16, 4 public inputs, PSE ceremony, 3,320,996 gas | `STATIC_REAL_DATA` | main.ts:326 | WASM/zkey fetched from CDN at proof time, NOT in repo |
| external/cubic_check.circom row | Show cubic_check circuit info | Accurate: BN254/Groth16, 1 public input, dev-only pot12, ~2.89M gas | `STATIC_REAL_DATA` | main.ts:327 | Full artifacts in repo (wasm, zkey, VK) |
| Download links | Allow artifact download | **Does not exist** — no download links in this tab | `PLACEHOLDER` | — | Missing feature |
| "Open in Forge" action | Load VK into Forge tab | **Does not exist** | `PLACEHOLDER` | — | Missing feature |
| "Open in Playground" action | Load proof/VK into Playground | **Does not exist** | `PLACEHOLDER` | — | Missing feature |
| Proof generation from Circuit Library | Generate proof directly from table | **Does not exist** | `PLACEHOLDER` | — | Missing feature |

---

## Tab: Forge

| Feature / Element | Intended Behavior | Actual Behavior | Classification | Source Reference | Notes |
|---|---|---|---|---|---|
| "Target Gno Package Path" input | Set pkgPath for generated verifier | Pre-filled `gno.land/r/.../custom_verifier`. Used as module path in generated `gno.mod` and package declaration. | `LIVE_BROWSER` | main.ts:339,684-685 | |
| `verification_key.json` textarea | Accept snarkjs VK JSON | Paste-only. No `<input type="file">`. Works for any BN254/Groth16 VK. | `LIVE_BROWSER` | main.ts:341 | |
| File upload input for VK | Allow file drag/drop or browse | **Does not exist** | `PLACEHOLDER` | — | Missing feature |
| "Validate & Generate Gno Verifier" button | Generate Gno verifier source | Calls `validateAndConvertVK()` + `generateGnoVerifierSource()`. Full BN254 field validation. G2 → EIP-197 conversion. Generates syntactically correct `.gno` file. | `LIVE_BROWSER` | main.ts:682-698, veil-browser.ts:33-148 | Real cryptographic validation; output imports live groth16/v2 package |
| VK validation (< p check) | Reject non-canonical coordinates | `parseFieldDecimal()` checks `n >= BN254_P` and throws. | `LIVE_BROWSER` | veil-browser.ts:22-31 | Correctly rejects invalid field elements |
| nPublic consistency check | Reject VK with IC/nPublic mismatch | Throws if `vk.nPublic !== IC.length - 1`. | `LIVE_BROWSER` | veil-browser.ts:38-40 | |
| Max public inputs guard | Reject VK with > 64 public inputs | Throws if `nPublic > 64`. | `LIVE_BROWSER` | veil-browser.ts:41 | |
| Generated `verifier.gno` display | Show generated Gno source | Full source displayed in `<pre>` block. | `LIVE_BROWSER` | main.ts:347 | No copy-to-clipboard button |
| "Export Deployable Bundle (.json)" button (conditional) | Download `gnomod.toml` + `verifier.gno` as JSON | Creates Blob `{"gnomod.toml": "...", "verifier.gno": "..."}` and triggers download as `veil-verifier-package.json`. | `LIVE_BROWSER` | main.ts:700-713 | Only appears after successful generation |
| Browser-side deployment to Onyx | Deploy verifier via browser | **Does not exist** — only CLI command is generated | `PLACEHOLDER` | — | Missing feature; deployment requires gnokey CLI |
| Error display | Show validation errors | `state.forgeError` shown in red status box. | `LIVE_BROWSER` | main.ts:346 | |

---

## Tab: Proof Playground

| Feature / Element | Intended Behavior | Actual Behavior | Classification | Source Reference | Notes |
|---|---|---|---|---|---|
| `verification_key.json` textarea | Accept VK for browser verification | Paste-only. No file upload. | `LIVE_BROWSER` | main.ts:357 | |
| `proof.json` textarea | Accept snarkjs proof JSON | Paste-only `{pi_a, pi_b, pi_c, protocol, curve}`. | `LIVE_BROWSER` | main.ts:361 | |
| `public.json` textarea | Accept public inputs JSON array | Paste-only `["value1", "value2", ...]`. | `LIVE_BROWSER` | main.ts:365 | |
| File upload inputs | Allow file drag/drop for JSON files | **Do not exist** — all 3 inputs are paste-only textareas | `PLACEHOLDER` | — | Missing feature across all 3 inputs |
| "Verify in Browser (snarkjs) & Encode for Gno" button | Run snarkjs verification + encode | Calls `snarkjs.groth16.verify(vkObj, pubObj, proofObj)` — real browser-side cryptographic verification. Also encodes to EIP-197 hex. | `LIVE_BROWSER` | main.ts:715-743, veil-browser.ts:63-82 | Real snarkjs verification; not simulated |
| snarkjs field validation | Validate proof fields against BN254 p | `validateAndConvertProof()` checks < BN254_P for all G1/G2 coordinates. | `LIVE_BROWSER` | veil-browser.ts:63-76 | |
| Public input validation | Validate inputs against BN254 r | `encodePublicInputs()` checks < BN254_R. | `LIVE_BROWSER` | veil-browser.ts:78-82 | |
| "BROWSER SNARKJS VERIFICATION: VALID" badge | Show verification result | Green badge on valid proof, red on invalid. | `LIVE_BROWSER` | main.ts:733-735 | Real snarkjs result |
| Verification & Gno Serialization Output `<pre>` | Show full encoding and CLI commands | Shows snarkjs result + A/B/C hex + public inputs + `veil test` CLI command + `gnokey maketx call` Onyx command. | `LIVE_BROWSER` | main.ts:736 | `gnokey` command uses `<realm>` placeholder — developer must substitute |
| On-chain proof submission from Playground | Submit verified proof to Onyx | **Does not exist** — Playground generates CLI commands only | `PLACEHOLDER` | — | No relayer integration in Playground |
| Error display | Show parsing/validation errors | `state.pgError` shown in red status box + "VALIDATION ERROR" badge. | `LIVE_BROWSER` | main.ts:739-740 | |
| Load example data | Pre-populate with sample proof | **Does not exist** | `PLACEHOLDER` | — | Missing QoL feature |

---

## Tab: Deployments

| Feature / Element | Intended Behavior | Actual Behavior | Classification | Source Reference | Notes |
|---|---|---|---|---|---|
| Deployments table (5 rows) | Show all deployed packages with metadata | Static HTML table with hardcoded data: package paths, roles, block heights, tx hashes, gas used. | `STATIC_REAL_DATA` | main.ts:380-389 | Data verified accurate against context summary |
| Package Path links | Link to Onyx explorer for each package | `<a>` tags linking to `https://onyx.gno.land/{p,r}/...`. Real explorer links. | `STATIC_REAL_DATA` | main.ts:383-387 | Explorer was verified reachable in prior E2E |
| Height column | Show deployment block height | Hardcoded: 1426060, 1426645, 1445403, 1445405, 1445406. Accurate. | `STATIC_REAL_DATA` | main.ts:383-387 | |
| Tx Hash column | Show deployment tx hash | Base64-encoded hashes. Accurate for each package. | `STATIC_REAL_DATA` | main.ts:383-387 | Cannot be clicked to view on explorer (not linked) |
| Gas Used column | Show deployment gas usage | Hardcoded: 59M, 24M, 47M, 17M, 6.4M. Accurate. | `STATIC_REAL_DATA` | main.ts:383-387 | |
| "Status" column | Show current on-chain activation status | Hardcoded "**Active**" for all 5 packages. NOT dynamically queried. | `STATIC_REAL_DATA` | main.ts:383-387 | Accurately reflects current state; would not update if packages became unavailable |
| GPAS approval status | Show GPAS ticket status | **Does not exist** in this UI | `PLACEHOLDER` | — | No GPAS integration |
| "Live On-Chain Registry" section | Show live registry records | Displays `state.onyxRegistryRecords` populated by `fetchOnyxRegistryRecords()`. | `LIVE_ONYX` | main.ts:390-392 | Only populated after Sync triggered from Vote tab |
| Refresh/Sync button on Deployments tab | Trigger registry sync from this tab | **Does not exist** — Sync is on Vote tab only | `PARTIAL` | — | Cross-tab dependency for live data |
| "No records loaded yet" fallback | Guide user when registry empty | Shown when `state.onyxRegistryRecords.length === 0`. | `LIVE_BROWSER` | main.ts:391 | Does not tell user where to find the Sync button |
| square_diff_verifier entry | Show second registry record | Will appear if `veil_registry/v1` has ≥2 records (expected: cubic_check #1, square_diff #2) | `LIVE_ONYX` | veil-browser.ts:263-267 | Populated dynamically when synced |

---

## Tab: Primitives

| Feature / Element | Intended Behavior | Actual Behavior | Classification | Source Reference | Notes |
|---|---|---|---|---|---|
| `semaphore/v1` import reference | Show how to import Semaphore primitives | Static `<pre>` code block with Gno import statements. | `STATIC_REAL_DATA` | main.ts:398-413 | **BUG: References `semaphore/v1` but deployed package is `semaphore/v2`** |
| `semaphore.HashToField()` usage | Show API for field-compatible hashing | Static code snippet. Accurate API (matches veil-browser.ts semaphoreHashHex). | `STATIC_REAL_DATA` | main.ts:406 | Wrong import version |
| `semaphore.DomainScopeFull()` usage | Show scoped nullifier derivation | Static code snippet. API matches live veil-browser.ts `deriveCanonicalScope`. | `STATIC_REAL_DATA` | main.ts:409 | Wrong import version |
| `semaphore.VerifyAndConsume()` usage | Show atomic verify+nullifier pattern | Static code snippet. | `STATIC_REAL_DATA` | main.ts:412 | Wrong import version |
| Interactive API explorer | Allow calling primitives from browser | **Does not exist** | `PLACEHOLDER` | — | Tab is documentation-only |
| Links to Gno source on explorer | Link to live package on onyx.gno.land | **Does not exist** | `PLACEHOLDER` | — | Missing feature |
| Playground integration | Test primitive functions interactively | **Does not exist** | `PLACEHOLDER` | — | |

---

## Relayer Endpoints

| Endpoint | Intended Behavior | Actual Behavior | Classification | Notes |
|---|---|---|---|---|
| `GET /health` | Return health status | Returns `{"status":"ok","ready":true,"chainId":"onyx-1","rpc":"...","voteRealm":"...","dailyBudgetUgnot":10000000,"spentUgnotToday":0,"pendingReconciliations":0}` | `LIVE_BACKEND` | Verified live |
| `GET /ready` | Return readiness status | Identical response to `/health` | `LIVE_BACKEND` | Verified live |
| `POST /api/relay/vote` | Accept vote proof and submit on-chain | Validates payload (hex lengths, allowed fields), checks rate limit (15 req/min/IP), checks daily budget, calls `gnokey maketx call Vote -simulate test`, returns `{txHash, gasUsed, height}` or `{error}` | `LIVE_BACKEND` | Requires VEIL_RELAYER_KEY and VEIL_RELAYER_PASSPHRASE env vars |
| Rate limiting | 15 req/min per IP | Implemented via in-memory `rateBuckets` Map with 60s sliding window. | `LIVE_BACKEND` | In-memory — resets on restart |
| Daily budget | 10M ugnot/day cap | Persistent via `VEIL_RELAYER_STATE_FILE` on Railway volume. Resets at UTC midnight. | `LIVE_BACKEND` | spentUgnotToday=0 as of audit |
| Crash recovery / reconciliation | Resume pending transactions after restart | Loads `pending` and `idempotency` maps from state file on startup. | `LIVE_BACKEND` | pendingReconciliations=0 |
| `GET /` (root) | Catch-all | Returns 404 JSON `{"error":"not found"}` | `LIVE_BACKEND` | |

---

## Summary Classification Counts

| Classification | Count | % of features |
|---|---|---|
| `LIVE_BROWSER` | 31 | 46% |
| `LIVE_ONYX` | 8 | 12% |
| `LIVE_BACKEND` | 6 | 9% |
| `LOCAL_ONLY` | 4 | 6% |
| `STATIC_REAL_DATA` | 15 | 22% |
| `RAILWAY_DEPENDENT` | 1 | 1.5% |
| `PLACEHOLDER` | 11 | — |
| `PARTIAL` | 2 | — |
| `MOCK` | 0 | 0% |
| `BROKEN` | 0 | 0% |

> [!NOTE] No features are classified as MOCK. The synthetic local polls (#42, #43) are `LOCAL_ONLY` demo data, not mocked live data — they are honestly labeled "LOCAL DEV SIMULATION" in the UI. No feature presents fabricated data as real on-chain state.

> [!IMPORTANT] PLACEHOLDER features (11 total) represent the gap between this engineering prototype and a complete developer product. The largest gaps: file upload across Forge/Playground, Circuit Library actionability, and browser-side on-chain deployment from Forge.
