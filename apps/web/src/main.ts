import {
  CORE_PKG_PATH,
  EXPLORER_BASE,
  ONYX_RPC,
  REGISTRY_REALM_PATH,
  VOTE_REALM_PATH,
  Group,
  Identity,
  encodePublicInputs,
  fetchOnyxPollState,
  fetchOnyxRegistryRecords,
  formatFriendlyError,
  generateGnoVerifierSource,
  generateProof,
  deriveCanonicalScope,
  semaphoreHashHex,
  snarkjs,
  unpackGroth16Proof,
  validateAndConvertProof,
  validateAndConvertVK,
  verifyArtifactIntegrity,
  verifyProof,
} from "./veil-browser";

type TabId = "vote" | "circuits" | "forge" | "playground" | "deployments" | "primitives";

interface PollState {
  id: number;
  groupId: number;
  title: string;
  options: string[];
  tallies: number[];
  closed: boolean;
}

const INITIAL_IDENTITIES = [
  new Identity(),
  new Identity(),
  new Identity(),
];

const state = {
  tab: "vote" as TabId,
  mode: "local" as "local" | "onyx",
  onyxHeight: "checking...",
  onyxRegistryRecords: [] as string[],
  onyxPoll1Tallies: [0, 0] as [number, number],
  onyxPoll1Root: "",
  onyxPoll1Count: 0,
  onyxPoll1Commitments: [] as string[],
  onyxLastTxHash: "",
  onyxSyncError: "",
  artifactCheckStatus: "Not checked",
  relayerUrl: (import.meta as any).env?.VITE_RELAYER_URL || "http://127.0.0.1:8787",
  // Vote state (Local Dev Mode simulates veil_vote/v3; Onyx Mode submits to onyx-1)
  identitySecret: "",
  identity: INITIAL_IDENTITIES[0],
  groups: [
    {
      id: 1,
      depth: 10,
      members: INITIAL_IDENTITIES.map((i) => i.commitment.toString()),
    },
  ],
  polls: [
    {
      id: 42,
      groupId: 1,
      title: "Onyx Protocol Parameter Proposal #42",
      options: ["Abstain", "Yes", "No"],
      tallies: [0, 0, 0],
      closed: false,
    },
    {
      id: 43,
      groupId: 1,
      title: "Treasury Grant Allocation #43",
      options: ["Abstain", "Approve", "Reject"],
      tallies: [0, 0, 0],
      closed: false,
    },
  ] as PollState[],
  spentNullifiers: new Set<string>(),
  selectedPollId: 42,
  selectedOption: 1,
  lastVoteProof: null as null | {
    pollId: number;
    optionIndex: number;
    rootHex: string;
    nullifierHex: string;
    a: string;
    b: string;
    c: string;
    upstreamValid: boolean;
  },
  voteStatus: "",
  adminStatus: "",
  // Forge state
  forgePkgPath: "gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/custom_verifier",
  forgeVkJson: "",
  forgeOutput: "",
  forgeError: "",
  // Playground state
  pgVkJson: "",
  pgProofJson: "",
  pgPublicJson: "",
  pgOutput: "",
  pgError: "",
  pgVerifyBadge: "",
};

function currentGroup() {
  if (state.mode === "onyx" && state.onyxPoll1Commitments.length > 0) {
    return { id: 1, depth: 10, members: state.onyxPoll1Commitments };
  }
  return state.groups[0];
}

function reconstructRoot(members: string[]) {
  const g = new Group(members.map((m) => BigInt(m)));
  return {
    group: g,
    rootDec: g.root.toString(),
    rootHex: BigInt(g.root).toString(16).padStart(64, "0"),
  };
}

async function refreshOnyxStatus() {
  try {
    const r = await fetch(`${ONYX_RPC.replace(":443", "")}/status`);
    const j = await r.json();
    state.onyxHeight = `${j.result.node_info.network} @ #${j.result.sync_info.latest_block_height} (${j.result.build_version})`;
    const [reg, poll1] = await Promise.all([
      fetchOnyxRegistryRecords(ONYX_RPC),
      fetchOnyxPollState(1, ONYX_RPC),
    ]);
    state.onyxRegistryRecords = reg;
    state.onyxPoll1Tallies = [poll1.tallies[0], poll1.tallies[1]];
    state.onyxPoll1Root = poll1.rootHex;
    state.onyxPoll1Count = poll1.commitments.length;
    state.onyxPoll1Commitments = poll1.commitments.map((h) => BigInt("0x" + h).toString());
    const existingPoll1 = state.polls.find((p) => p.id === 1);
    if (existingPoll1) {
      existingPoll1.tallies = [poll1.tallies[0], poll1.tallies[1]];
    } else {
      state.polls.unshift({
        id: 1,
        groupId: 1,
        title: "Onyx Live Poll #1",
        options: ["Yes", "No"],
        tallies: [poll1.tallies[0], poll1.tallies[1]],
        closed: false,
      });
    }
    state.onyxSyncError = "";
  } catch (e) {
    state.onyxHeight = state.onyxHeight === "checking..." ? "unreachable" : state.onyxHeight;
    state.onyxSyncError = formatFriendlyError(e);
  }
  render();
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function angularLogo() {
  return `<svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <path d="M4 6L16 28L28 6H22.5L16 18.5L9.5 6H4Z" fill="#f4f4f5"/>
    <path d="M12.5 6L16 12.5L19.5 6H12.5Z" fill="#71717a"/>
  </svg>`;
}

function renderVoteTab(): string {
  const poll = state.polls.find((p) => p.id === state.selectedPollId) || state.polls[0];
  const grp = currentGroup();
  const { rootHex } = reconstructRoot(grp.members);
  const commitmentHex = BigInt(state.identity.commitment).toString(16).padStart(64, "0");
  const isMember = grp.members.includes(state.identity.commitment.toString());

  return `
  <div class="grid-2">
    <div class="card">
      <h2>1. Local Semaphore v4 Identity</h2>
      <p class="muted">Secrets stay strictly inside browser memory. Only your Poseidon commitment is public.</p>
      <label>Identity Seed / Secret (Local Only)</label>
      <input id="id-secret" value="${esc(state.identitySecret)}" />
      <div class="row">
        <button class="primary" id="btn-restore-id">Restore Identity</button>
        <button class="secondary" id="btn-new-id">Generate Random Identity</button>
      </div>
      <label>Identity Commitment (Hex)</label>
      <pre>${commitmentHex}</pre>
      <div class="badge ${isMember ? "ok" : "warn"}">
        ${isMember ? "REGISTERED IN GROUP #1" : "NOT IN GROUP #1 (Use Admin Panel to register)"}
      </div>
    </div>

    <div class="card">
      <h2>2. Group #1 &amp; LeanIMT Root</h2>
      <p class="muted">Reconstructed locally from ${grp.members.length} registered commitments (depth ${grp.depth}).</p>
      <label>Reconstructed Merkle Root (Hex)</label>
      <pre>${rootHex}</pre>
      <label>Registered Commitments (${grp.members.length})</label>
      <pre>${grp.members.map((m, i) => `[${i}] ${BigInt(m).toString(16).padStart(64, "0")}`).join("\n")}</pre>
    </div>
  </div>

  <div class="card">
    <h2>3. Cast Anonymous Vote (${state.mode === "local" ? "LOCAL DEV SIMULATION" : "ONYX TESTNET"})</h2>
    <p class="muted">
      V1 Privacy Notice: Group membership is proven in zero-knowledge; the selected vote option is public.
    </p>
    <div class="grid-2">
      <div>
        <label>Select Poll</label>
        <select id="poll-select">
          ${state.polls
            .map(
              (p) =>
                `<option value="${p.id}" ${p.id === poll.id ? "selected" : ""}>#${p.id} — ${esc(p.title)} ${p.closed ? "(CLOSED)" : ""}</option>`
            )
            .join("")}
        </select>

        <label>Select Vote Option (Public)</label>
        <select id="opt-select">
          ${poll.options
            .map(
              (o, i) =>
                `<option value="${i}" ${i === state.selectedOption ? "selected" : ""}>[${i}] ${esc(o)}</option>`
            )
            .join("")}
        </select>

      <div class="row">
        <button class="primary" id="btn-gen-proof">Generate Semaphore Proof (Browser-Local)</button>
        ${
          state.lastVoteProof
            ? `<button class="secondary" id="btn-submit-local">${state.mode === "local" ? "Submit Vote (Browser-Local State)" : "Simulate Vote (Browser-Local)"}</button>
               <button class="secondary" id="btn-submit-relayer">Submit On-Chain via Relayer (Onyx)</button>`
            : ""
        }
        <button class="secondary" id="btn-sync-onyx">Sync Live Onyx State</button>
      </div>
      ${state.voteStatus ? `<div class="status-box">${esc(state.voteStatus)}</div>` : ""}
      ${
        state.onyxLastTxHash
          ? `<div class="status-box">On-Chain Onyx Tx: <a href="${EXPLORER_BASE}/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/veil_vote/v3" target="_blank" rel="noopener"><code>${esc(state.onyxLastTxHash)}</code></a></div>`
          : ""
      }
      <div class="status-box" style="margin-top:8px">
        <strong>Live Onyx Poll #1 (<code>veil_vote/v3</code>):</strong>
        Yes=${state.onyxPoll1Tallies[0]}, No=${state.onyxPoll1Tallies[1]} |
        Snapshot Members=${state.onyxPoll1Count} |
        Reconstructed Root=<code>${esc(state.onyxPoll1Root || "syncing...")}</code>
        ${state.onyxSyncError ? `<br/><span style="color:var(--status-err)">${esc(state.onyxSyncError)}</span>` : ""}
      </div>
    </div>

      <div>
        <label>Current Poll Tallies</label>
        <table>
          <thead><tr><th>Option</th><th>Votes</th></tr></thead>
          <tbody>
            ${poll.options
              .map((o, i) => `<tr><td>[${i}] ${esc(o)}</td><td>${poll.tallies[i]}</td></tr>`)
              .join("")}
          </tbody>
        </table>
        ${
          state.lastVoteProof
            ? `<label>Generated Proof Artifacts (Public Only)</label>
               <pre>Nullifier: ${state.lastVoteProof.nullifierHex}
Upstream verifyProof: ${state.lastVoteProof.upstreamValid}
gnokey maketx call \\
  -pkgpath "${VOTE_REALM_PATH}" \\
  -func Vote \\
  -args ${state.lastVoteProof.pollId} -args 10 \\
  -args ${state.lastVoteProof.rootHex} \\
  -args ${state.lastVoteProof.nullifierHex} \\
  -args ${state.lastVoteProof.optionIndex} \\
  -args ${state.lastVoteProof.a.slice(0, 24)}... \\
  -args ${state.lastVoteProof.b.slice(0, 24)}... \\
  -args ${state.lastVoteProof.c.slice(0, 24)}... \\
  -chainid onyx-1 -remote ${ONYX_RPC} &lt;key&gt;</pre>`
            : ""
        }
      </div>
    </div>
  </div>

  <div class="card">
    <h2>4. Group &amp; Poll Administration</h2>
    <div class="grid-2">
      <div>
        <label>Register Commitment Hex (64 hex chars)</label>
        <input id="admin-comm" value="${commitmentHex}" />
        <button class="secondary" id="btn-admin-add-member">Add Member &amp; Publish Root</button>
      </div>
      <div>
        <label>Create New Poll Title / Options CSV</label>
        <input id="admin-poll-title" value="Proposal #44" />
        <input id="admin-poll-opts" value="Abstain,For,Against" style="margin-top:6px" />
        <button class="secondary" id="btn-admin-create-poll">Create Poll</button>
      </div>
    </div>
    ${state.adminStatus ? `<div class="status-box">${esc(state.adminStatus)}</div>` : ""}
  </div>`;
}

function renderCircuitsTab(): string {
  return `
  <div class="card">
    <h2>Supported Circuit Library</h2>
    <p class="muted">All circuits below verify through the identical Veil Core engine (${CORE_PKG_PATH}) with zero Core modifications.</p>
    <table>
      <thead><tr><th>Circuit</th><th>Curve / Protocol</th><th>Public Inputs</th><th>Setup Provenance</th><th>Verified GnoVM Gas</th></tr></thead>
      <tbody>
        <tr><td>multiplier.circom</td><td>BN254 / Groth16</td><td>1 ([c])</td><td>Dev-Only (pot12)</td><td>2,888,411 (net Verify)</td></tr>
        <tr><td>sum_of_squares.circom</td><td>BN254 / Groth16</td><td>2 ([ok, target])</td><td>Dev-Only (pot12)</td><td>3,029,774 (net Verify)</td></tr>
        <tr><td>semaphore-10 (v4.13.0)</td><td>BN254 / Groth16</td><td>4 ([root, nullifier, h(msg), h(scope)])</td><td>Ceremony-Backed (PSE)</td><td>3,320,996 (net Verify)</td></tr>
        <tr><td>external/cubic_check.circom</td><td>BN254 / Groth16</td><td>1 ([out])</td><td>Dev-Only (3rd-party example)</td><td>~2.89M (net Verify)</td></tr>
      </tbody>
    </table>
  </div>`;
}

function renderForgeTab(): string {
  return `
  <div class="card">
    <h2>Veil Forge — snarkjs VK to Gno Verifier Generator</h2>
    <p class="muted">Paste any snarkjs Groth16/BN254 <code>verification_key.json</code>. Coordinates are validated (&lt; p), G2 is converted to EIP-197 imaginary-first order, and the generated realm imports Veil Core.</p>
    <label>Target Gno Package Path</label>
    <input id="forge-pkg" value="${esc(state.forgePkgPath)}" />
    <label>verification_key.json</label>
    <textarea id="forge-vk" placeholder='{"protocol":"groth16","curve":"bn128",...}'>${esc(state.forgeVkJson)}</textarea>
    <div class="row">
      <button class="primary" id="btn-forge-gen">Validate &amp; Generate Gno Verifier</button>
      ${state.forgeOutput ? `<button class="secondary" id="btn-forge-export">Export Deployable Bundle (.json)</button>` : ""}
    </div>
    ${state.forgeError ? `<div class="status-box" style="color:var(--status-err)">${esc(state.forgeError)}</div>` : ""}
    ${state.forgeOutput ? `<label>Generated verifier.gno</label><pre>${esc(state.forgeOutput)}</pre>` : ""}
  </div>`;
}

function renderPlaygroundTab(): string {
  return `
  <div class="card">
    <h2>Proof Playground — Browser Verification &amp; Gno Encoding</h2>
    <p class="muted">Import <code>verification_key.json</code>, <code>proof.json</code>, and <code>public.json</code> to run <strong>real browser-side snarkjs Groth16 verification</strong>, inspect EIP-197 Gno encodings, and generate GnoVM / Onyx commands.</p>
    <label>verification_key.json (required for browser snarkjs verification)</label>
    <textarea id="pg-vk" placeholder='{"protocol":"groth16","curve":"bn128",...}'>${esc(state.pgVkJson)}</textarea>
    <div class="grid-2">
      <div>
        <label>proof.json</label>
        <textarea id="pg-proof" placeholder='{"pi_a":[...],"pi_b":[...],"pi_c":[...]}'>${esc(state.pgProofJson)}</textarea>
      </div>
      <div>
        <label>public.json</label>
        <textarea id="pg-public" placeholder='["91"]'>${esc(state.pgPublicJson)}</textarea>
      </div>
    </div>
    <button class="primary" id="btn-pg-encode">Verify in Browser (snarkjs) &amp; Encode for Gno</button>
    ${state.pgVerifyBadge ? `<div style="margin-top:10px">${state.pgVerifyBadge}</div>` : ""}
    ${state.pgError ? `<div class="status-box" style="color:var(--status-err)">${esc(state.pgError)}</div>` : ""}
    ${state.pgOutput ? `<label>Verification &amp; Gno Serialization Output</label><pre>${esc(state.pgOutput)}</pre>` : ""}
  </div>`;
}

function renderDeploymentsTab(): string {
  return `
  <div class="card">
    <h2>Onyx Testnet Deployments (<code>onyx-1</code>)</h2>
    <p class="muted">All 5 V1 RC2 packages are <strong>active</strong> on <code>onyx-1</code> (<code>https://rpc.onyx.testnets.gno.land:443</code>). Note: <code>veil_vote/v3</code> uses a trusted <code>RootPublisher</code> for group membership roots.</p>
    <table>
      <thead><tr><th>Package Path</th><th>Role</th><th>Height</th><th>Tx Hash</th><th>Gas Used</th><th>Status</th></tr></thead>
      <tbody>
        <tr><td><a href="https://onyx.gno.land/p/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/groth16/v2" target="_blank" rel="noopener">groth16/v2</a></td><td>Core Verifier</td><td>1426060</td><td><code>U61xv6bC85z9VopmocG5DV7iumLhEOEtCLC8TEESZPU=</code></td><td>59,348,160</td><td><strong>Active</strong></td></tr>
        <tr><td><a href="https://onyx.gno.land/p/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/semaphore/v2" target="_blank" rel="noopener">semaphore/v2</a></td><td>Primitives</td><td>1426645</td><td><code>yhsY8yPnhZMsWQXr2sDO1GHuLxQr/XzZi9KLr8KZ9ME=</code></td><td>24,166,378</td><td><strong>Active</strong></td></tr>
        <tr><td><a href="https://onyx.gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/veil_vote/v3" target="_blank" rel="noopener">veil_vote/v3</a></td><td>Vote Realm</td><td>1445403</td><td><code>n8gsscfoGHMyEy5p0yj9cDlg/M9Io5gWcH9Numi5cOw=</code></td><td>47,790,095</td><td><strong>Active</strong></td></tr>
        <tr><td><a href="https://onyx.gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/veil_registry/v1" target="_blank" rel="noopener">veil_registry/v1</a></td><td>Registry Realm</td><td>1445405</td><td><code>Z3nPuj8AoPVXdPOuWx3czo+Bk9dJQPhbVpNRsbJzJkw=</code></td><td>17,058,134</td><td><strong>Active</strong></td></tr>
        <tr><td><a href="https://onyx.gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/cubic_check_verifier" target="_blank" rel="noopener">cubic_check_verifier</a></td><td>Forge Verifier</td><td>1445406</td><td><code>2UQcV5zMkm+5F7RzJ2qzRtdvuaRzpkSkvP7icJPS3FQ=</code></td><td>6,480,793</td><td><strong>Active</strong></td></tr>
      </tbody>
    </table>
    <h3 style="margin-top:16px">Live On-Chain Registry (<code>${REGISTRY_REALM_PATH}</code>)</h3>
    <pre>${esc(state.onyxRegistryRecords.length ? state.onyxRegistryRecords.join("\n") : "No records loaded yet (click Sync Live Onyx State on Vote tab).")}</pre>
  </div>`;
}

function renderPrimitivesTab(): string {
  return `
  <div class="card">
    <h2>Veil Primitives (<code>semaphore/v1</code>)</h2>
    <p class="muted">Reusable Gno building blocks for Semaphore v4 membership, domain-separated scopes, and atomic nullifier tracking.</p>
    <pre>import (
  "gno.land/p/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/groth16/v2"
  "gno.land/p/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/semaphore/v1"
)

// Canonical Semaphore v4 hash: uint256(keccak256(toBeHex(val, 32))) >> 8
msgHash, _ := semaphore.HashToField(semaphore.Uint64ToBE32(1))

// Domain-separated scope across network, app, group, and poll
scope := semaphore.DomainScopeFull("onyx-1", "my_app/v1", groupID, pollID)

// Atomic verification + nullifier consumption
err := semaphore.VerifyAndConsume(vks, groups, nullifiers, groupID, 10, root, nullifier, rawMsg, rawScope, proof)</pre>
  </div>`;
}

function render() {
  const app = document.getElementById("app")!;
  const tabContent =
    state.tab === "vote"
      ? renderVoteTab()
      : state.tab === "circuits"
        ? renderCircuitsTab()
        : state.tab === "forge"
          ? renderForgeTab()
          : state.tab === "playground"
            ? renderPlaygroundTab()
            : state.tab === "deployments"
              ? renderDeploymentsTab()
              : renderPrimitivesTab();

  app.innerHTML = `
  <div class="shell">
    <header class="topbar">
      <div class="brand">
        ${angularLogo()}
        <div>
          <div class="brand-title">VEIL PROTOCOL</div>
          <div class="brand-sub">Zero-Knowledge Developer Infrastructure for Gno.land</div>
        </div>
      </div>
      <div class="mode-bar">
        <span class="badge ${state.mode === "local" ? "warn" : "ok"}">
          ${state.mode === "local" ? "MODE: LOCAL DEV" : "MODE: ONYX TESTNET"}
        </span>
        <span class="badge">RPC: ${esc(state.onyxHeight)}</span>
        <button class="secondary" id="btn-toggle-mode" style="margin-top:0">
          Switch to ${state.mode === "local" ? "Onyx Mode" : "Local Dev Mode"}
        </button>
      </div>
    </header>

    <nav class="nav">
      ${(
        [
          ["vote", "Veil Vote (Showcase)"],
          ["circuits", "Circuit Library"],
          ["forge", "Forge"],
          ["playground", "Proof Playground"],
          ["deployments", "Deployments"],
          ["primitives", "Primitives"],
        ] as Array<[TabId, string]>
      )
        .map(
          ([id, label]) =>
            `<button class="${state.tab === id ? "active" : ""}" data-tab="${id}">${label}</button>`
        )
        .join("")}
    </nav>

    <main>${tabContent}</main>
  </div>`;

  bindEvents();
}

function bindEvents() {
  document.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((b) => {
    b.onclick = () => {
      state.tab = b.dataset.tab as TabId;
      render();
    };
  });

  const toggle = document.getElementById("btn-toggle-mode");
  if (toggle) {
    toggle.onclick = () => {
      state.mode = state.mode === "local" ? "onyx" : "local";
      if (state.mode === "onyx" && state.polls.some((p) => p.id === 1)) {
        state.selectedPollId = 1;
      }
      render();
    };
  }

  const restoreBtn = document.getElementById("btn-restore-id");
  if (restoreBtn) {
    restoreBtn.onclick = () => {
      const val = (document.getElementById("id-secret") as HTMLInputElement).value;
      state.identitySecret = val;
      state.identity = new Identity(val);
      state.lastVoteProof = null;
      render();
    };
  }

  const newIdBtn = document.getElementById("btn-new-id");
  if (newIdBtn) {
    newIdBtn.onclick = () => {
      const id = new Identity();
      state.identitySecret = "random-ephemeral-identity";
      state.identity = id;
      state.lastVoteProof = null;
      render();
    };
  }

  const pollSel = document.getElementById("poll-select") as HTMLSelectElement | null;
  if (pollSel) {
    pollSel.onchange = () => {
      state.selectedPollId = Number(pollSel.value);
      state.lastVoteProof = null;
      render();
    };
  }

  const optSel = document.getElementById("opt-select") as HTMLSelectElement | null;
  if (optSel) {
    optSel.onchange = () => {
      state.selectedOption = Number(optSel.value);
      render();
    };
  }

  const syncOnyxBtn = document.getElementById("btn-sync-onyx");
  if (syncOnyxBtn) {
    syncOnyxBtn.onclick = () => refreshOnyxStatus();
  }

  const genProofBtn = document.getElementById("btn-gen-proof");
  if (genProofBtn) {
    genProofBtn.onclick = async () => {
      try {
        state.voteStatus = "Generating client-side Semaphore v4 Groth16 proof...";
        render();
        const grp = currentGroup();
        const { group } = reconstructRoot(grp.members);
        const pollId = state.selectedPollId;
        const opt = state.selectedOption;
        const network = state.mode === "local" ? "dev" : "onyx-1";
        const scopeHex = deriveCanonicalScope(network, VOTE_REALM_PATH, grp.id, pollId);
        const semProof = await generateProof(state.identity, group, BigInt(opt), BigInt("0x" + scopeHex), 10);
        const upstreamValid = await verifyProof(semProof);
        const unpacked = unpackGroth16Proof(semProof.points);
        const enc = validateAndConvertProof(unpacked);
        state.lastVoteProof = {
          pollId,
          optionIndex: opt,
          rootHex: BigInt(semProof.merkleTreeRoot).toString(16).padStart(64, "0"),
          nullifierHex: BigInt(semProof.nullifier).toString(16).padStart(64, "0"),
          a: enc.a,
          b: enc.b,
          c: enc.c,
          upstreamValid,
        };
        state.voteStatus = `Client-side proof generated. Upstream verifyProof=${upstreamValid}. Ready to submit.`;
      } catch (e: any) {
        state.voteStatus = `Proof generation failed: ${e.message}`;
      }
      render();
    };
  }

  const submitLocalBtn = document.getElementById("btn-submit-local");
  if (submitLocalBtn) {
    submitLocalBtn.onclick = () => {
      const p = state.lastVoteProof;
      if (!p) return;
      const poll = state.polls.find((x) => x.id === p.pollId);
      if (!poll) return;
      if (poll.closed) {
        state.voteStatus = "Rejected: poll is closed.";
        return render();
      }
      const key = `${p.pollId}:${p.nullifierHex}`;
      if (state.spentNullifiers.has(key)) {
        state.voteStatus = "Rejected: duplicate vote (nullifier already spent in this poll).";
        return render();
      }
      if (!p.upstreamValid) {
        state.voteStatus = "Rejected: invalid proof.";
        return render();
      }
      state.spentNullifiers.add(key);
      poll.tallies[p.optionIndex]++;
      state.voteStatus = `LOCAL DEV: Vote recorded for option [${p.optionIndex}] in Poll #${p.pollId}.`;
      render();
    };
  }

  const submitRelayerBtn = document.getElementById("btn-submit-relayer");
  if (submitRelayerBtn) {
    submitRelayerBtn.onclick = async () => {
      const p = state.lastVoteProof;
      if (!p) return;
      try {
        const res = await fetch(`${state.relayerUrl}/api/relay/vote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pollId: p.pollId,
            depth: 10,
            optionIndex: p.optionIndex,
            rootHex: p.rootHex,
            nullifierHex: p.nullifierHex,
            a: p.a,
            b: p.b,
            c: p.c,
          }),
        });
        const j = await res.json();
        if (j.txHash) {
          state.onyxLastTxHash = j.txHash;
          refreshOnyxStatus();
        }
        state.voteStatus = j.error
          ? `Relayer (${res.status}): ${formatFriendlyError(j.error)}`
          : `Relayer (${res.status}): ${JSON.stringify(j)}`;
      } catch (e: any) {
        state.voteStatus = `Relayer unreachable at ${state.relayerUrl}: ${formatFriendlyError(e)}`;
      }
      render();
    };
  }

  const addMemberBtn = document.getElementById("btn-admin-add-member");
  if (addMemberBtn) {
    addMemberBtn.onclick = () => {
      const hex = (document.getElementById("admin-comm") as HTMLInputElement).value.trim();
      try {
        const dec = BigInt("0x" + hex.replace(/^0x/, "")).toString();
        const grp = currentGroup();
        if (grp.members.includes(dec)) {
          state.adminStatus = "Rejected: duplicate commitment already in Group #1.";
        } else {
          grp.members.push(dec);
          const { rootHex } = reconstructRoot(grp.members);
          state.adminStatus = `Added member to Group #1. New root: ${rootHex}`;
        }
      } catch {
        state.adminStatus = "Invalid 32-byte commitment hex.";
      }
      render();
    };
  }

  const createPollBtn = document.getElementById("btn-admin-create-poll");
  if (createPollBtn) {
    createPollBtn.onclick = () => {
      const title = (document.getElementById("admin-poll-title") as HTMLInputElement).value.trim();
      const opts = (document.getElementById("admin-poll-opts") as HTMLInputElement).value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (opts.length < 2) {
        state.adminStatus = "Poll requires at least 2 options.";
      } else {
        const nextId = Math.max(...state.polls.map((p) => p.id)) + 1;
        state.polls.push({
          id: nextId,
          groupId: 1,
          title: title || `Proposal #${nextId}`,
          options: opts,
          tallies: new Array(opts.length).fill(0),
          closed: false,
        });
        state.adminStatus = `Created Poll #${nextId} (${opts.length} options).`;
      }
      render();
    };
  }

  const forgeBtn = document.getElementById("btn-forge-gen");
  if (forgeBtn) {
    forgeBtn.onclick = () => {
      state.forgePkgPath = (document.getElementById("forge-pkg") as HTMLInputElement).value.trim();
      state.forgeVkJson = (document.getElementById("forge-vk") as HTMLTextAreaElement).value;
      state.forgeError = "";
      state.forgeOutput = "";
      try {
        const vk = JSON.parse(state.forgeVkJson);
        const conv = validateAndConvertVK(vk);
        state.forgeOutput = generateGnoVerifierSource(state.forgePkgPath, conv);
      } catch (e: any) {
        state.forgeError = e.message;
      }
      render();
    };
  }

  const forgeExportBtn = document.getElementById("btn-forge-export");
  if (forgeExportBtn) {
    forgeExportBtn.onclick = () => {
      const bundle = {
        "gnomod.toml": `module = "${state.forgePkgPath}"\ngno = "0.9"\n`,
        "verifier.gno": state.forgeOutput,
      };
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "veil-verifier-package.json";
      a.click();
    };
  }

  const pgBtn = document.getElementById("btn-pg-encode");
  if (pgBtn) {
    pgBtn.onclick = async () => {
      state.pgVkJson = (document.getElementById("pg-vk") as HTMLTextAreaElement).value;
      state.pgProofJson = (document.getElementById("pg-proof") as HTMLTextAreaElement).value;
      state.pgPublicJson = (document.getElementById("pg-public") as HTMLTextAreaElement).value;
      state.pgError = "";
      state.pgOutput = "";
      state.pgVerifyBadge = "";
      try {
        const vkObj = JSON.parse(state.pgVkJson);
        const proofObj = JSON.parse(state.pgProofJson);
        const pubObj = JSON.parse(state.pgPublicJson);
        validateAndConvertVK(vkObj);
        const p = validateAndConvertProof(proofObj);
        const pub = encodePublicInputs(pubObj);

        const ok = await snarkjs.groth16.verify(vkObj, pubObj, proofObj);
        state.pgVerifyBadge = ok
          ? `<span class="badge ok">BROWSER SNARKJS VERIFICATION: VALID</span>`
          : `<span class="badge err">BROWSER SNARKJS VERIFICATION: INVALID (Proof Rejected)</span>`;
        state.pgOutput = `[1] BROWSER SNARKJS: ${ok ? "VALID" : "INVALID"}\n[2] GNO EIP-197 ENCODING:\nA (G1 64B): ${p.a}\nB (G2 128B EIP-197): ${p.b}\nC (G1 64B): ${p.c}\nPublic Inputs (${pub.length}): ${pub.join(",")}\n\n[3] GNOVM VERIFICATION (CLI):\nnode cli/veil.js test --dir <verifier-dir> --proof proof.json --public public.json\n\n[4] ONYX ON-CHAIN CALL:\ngnokey maketx call -pkgpath "<realm>" -func Verify -args ${p.a} -args ${p.b} -args ${p.c} -args ${pub.join(",")} -chainid onyx-1 -remote ${ONYX_RPC} <key>`;
      } catch (e: any) {
        state.pgError = e.message;
        state.pgVerifyBadge = `<span class="badge err">VALIDATION ERROR</span>`;
      }
      render();
    };
  }
}

render();
refreshOnyxStatus();
