import React, { useMemo, useState } from "react";
import {
  Group,
  Identity,
  VOTE_REALM_PATH,
  deriveCanonicalScope,
  generateProof,
  unpackGroth16Proof,
  validateAndConvertProof,
  verifyProof,
} from "../veil-browser";
import { Panel } from "../components/Panel";
import { Button } from "../components/Button";
import { StatusBadge } from "../components/StatusBadge";
import { Notice } from "../components/Notice";

interface LocalPoll {
  id: number;
  title: string;
  options: string[];
  tallies: number[];
}

export function SandboxPage() {
  const [seedInput, setSeedInput] = useState("");
  const [identity, setIdentity] = useState(() => new Identity());
  const [members, setMembers] = useState<string[]>(() => [
    new Identity().commitment.toString(),
    new Identity().commitment.toString(),
  ]);
  const [polls, setPolls] = useState<LocalPoll[]>([
    { id: 42, title: "Onyx Parameter Proposal #42", options: ["Abstain", "Yes", "No"], tallies: [0, 0, 0] },
  ]);
  const [selectedPollId, setSelectedPollId] = useState(42);
  const [selectedOption, setSelectedOption] = useState(1);
  const [spentNullifiers, setSpentNullifiers] = useState<Set<string>>(() => new Set());
  const [proving, setProving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [proofResult, setProofResult] = useState<{
    pollId: number;
    optionIndex: number;
    nullifierHex: string;
    upstreamValid: boolean;
  } | null>(null);

  const [newPollTitle, setNewPollTitle] = useState("Proposal #44");
  const [newPollOpts, setNewPollOpts] = useState("Abstain,For,Against");

  const commitmentDec = identity.commitment.toString();
  const commitmentHex = BigInt(commitmentDec).toString(16).padStart(64, "0");
  const isMember = members.includes(commitmentDec);

  const { group, rootHex } = useMemo(() => {
    const g = new Group(members.map((m) => BigInt(m)));
    return { group: g, rootHex: BigInt(g.root).toString(16).padStart(64, "0") };
  }, [members]);

  const activePoll = polls.find((p) => p.id === selectedPollId) || polls[0];

  const invalidateProof = () => {
    setProofResult(null);
    setStatusMsg("");
  };

  const handleRestore = () => {
    if (!seedInput) return;
    setIdentity(new Identity(seedInput));
    invalidateProof();
  };

  const handleRandom = () => {
    setSeedInput("");
    setIdentity(new Identity());
    invalidateProof();
  };

  const handleJoinGroup = () => {
    if (isMember) return;
    setMembers((prev) => [...prev, commitmentDec]);
    invalidateProof();
    setStatusMsg("Added your identity commitment to the local simulated group.");
  };

  const handleGenerateProof = async () => {
    setProving(true);
    setProofResult(null);
    setStatusMsg("Generating client-side Semaphore v4 Groth16 proof...");
    try {
      const scopeHex = deriveCanonicalScope("dev", VOTE_REALM_PATH, 1, activePoll.id);
      const semProof = await generateProof(identity, group, BigInt(selectedOption), BigInt("0x" + scopeHex), 10);
      const upstreamValid = await verifyProof(semProof);
      const unpacked = unpackGroth16Proof(semProof.points);
      validateAndConvertProof(unpacked);
      const nullifierHex = BigInt(semProof.nullifier).toString(16).padStart(64, "0");
      setProofResult({
        pollId: activePoll.id,
        optionIndex: selectedOption,
        nullifierHex,
        upstreamValid,
      });
      setStatusMsg(`Proof generated in-browser. verifyProof=${upstreamValid}. Ready to simulate vote.`);
    } catch (e: any) {
      setStatusMsg(`Proof generation failed: ${e?.message || String(e)}`);
    } finally {
      setProving(false);
    }
  };

  const handleSimulateVote = () => {
    if (!proofResult) return;
    const key = `${proofResult.pollId}:${proofResult.nullifierHex}`;
    if (spentNullifiers.has(key)) {
      setStatusMsg("Rejected: duplicate vote (nullifier already spent in this local poll).");
      return;
    }
    if (!proofResult.upstreamValid) {
      setStatusMsg("Rejected: invalid proof.");
      return;
    }
    setSpentNullifiers((prev) => new Set(prev).add(key));
    setPolls((prev) =>
      prev.map((p) =>
        p.id === proofResult.pollId
          ? { ...p, tallies: p.tallies.map((t, idx) => (idx === proofResult.optionIndex ? t + 1 : t)) }
          : p
      )
    );
    setStatusMsg(`LOCAL SIMULATION: Vote recorded for [${activePoll.options[proofResult.optionIndex]}] in Poll #${proofResult.pollId}.`);
  };

  const handleCreatePoll = () => {
    const opts = newPollOpts.split(",").map((s) => s.trim()).filter(Boolean);
    if (opts.length < 2) return;
    const nextId = Math.max(...polls.map((p) => p.id)) + 1;
    setPolls((prev) => [
      ...prev,
      { id: nextId, title: newPollTitle.trim() || `Proposal #${nextId}`, options: opts, tallies: new Array(opts.length).fill(0) },
    ]);
    setSelectedPollId(nextId);
    setSelectedOption(0);
    invalidateProof();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 28, marginBottom: 6 }}>Local Voting Sandbox</h1>
          <p style={{ margin: 0, color: "var(--veil-muted)" }}>
            Real browser-local Semaphore v4 proof generation with simulated group &amp; poll state. No on-chain transactions.
          </p>
        </div>
        <StatusBadge tone="amber">LOCAL SIMULATION</StatusBadge>
      </div>

      <div className="veil-grid-2">
        <Panel title="1. Semaphore v4 Identity" subtitle="Secrets stay in browser memory only">
          <label className="veil-label" htmlFor="sb-seed">Identity Seed (masked)</label>
          <input
            id="sb-seed"
            type="password"
            className="veil-input"
            placeholder="Enter secret seed to restore..."
            value={seedInput}
            onChange={(e) => setSeedInput(e.target.value)}
          />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <Button variant="secondary" type="button" onClick={handleRestore} disabled={!seedInput}>
              Restore from Seed
            </Button>
            <Button variant="ghost" type="button" onClick={handleRandom}>
              Generate Random
            </Button>
          </div>
          <div style={{ marginTop: 14 }}>
            <div className="veil-label">Public Commitment (Hex)</div>
            <div className="mono" style={{ fontSize: 12, wordBreak: "break-all", color: "var(--veil-muted)" }}>
              {commitmentHex}
            </div>
          </div>
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <StatusBadge tone={isMember ? "mint" : "amber"}>
              {isMember ? "Member of Local Group" : "Not in Local Group"}
            </StatusBadge>
            {!isMember && (
              <Button variant="primary" type="button" onClick={handleJoinGroup} style={{ minHeight: 34, padding: "4px 12px", fontSize: 12.5 }}>
                Join Local Group
              </Button>
            )}
          </div>
        </Panel>

        <Panel title="2. Simulated Group &amp; LeanIMT Root" subtitle={`${members.length} members`}>
          <div className="veil-label">Reconstructed Root (Hex)</div>
          <div className="mono" style={{ fontSize: 12, wordBreak: "break-all", color: "var(--veil-mint)", marginBottom: 12 }}>
            {rootHex}
          </div>
          <div className="veil-label">Create Local Poll</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input className="veil-input" value={newPollTitle} onChange={(e) => setNewPollTitle(e.target.value)} style={{ flex: "1 1 140px" }} />
            <input className="veil-input" value={newPollOpts} onChange={(e) => setNewPollOpts(e.target.value)} style={{ flex: "1 1 160px" }} />
            <Button variant="secondary" type="button" onClick={handleCreatePoll}>Create</Button>
          </div>
        </Panel>
      </div>

      <Panel title="3. Generate Proof &amp; Simulate Vote">
        <div className="veil-grid-2">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label className="veil-label" htmlFor="sb-poll">Select Poll</label>
              <select
                id="sb-poll"
                className="veil-select"
                value={activePoll.id}
                onChange={(e) => {
                  setSelectedPollId(Number(e.target.value));
                  setSelectedOption(0);
                  invalidateProof();
                }}
              >
                {polls.map((p) => (
                  <option key={p.id} value={p.id}>#{p.id} — {p.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="veil-label" htmlFor="sb-opt">Select Option (Public)</label>
              <select
                id="sb-opt"
                className="veil-select"
                value={selectedOption}
                onChange={(e) => {
                  setSelectedOption(Number(e.target.value));
                  invalidateProof();
                }}
              >
                {activePoll.options.map((o, i) => (
                  <option key={o} value={i}>[{i}] {o}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Button variant="primary" type="button" onClick={handleGenerateProof} disabled={proving || !isMember}>
                {proving ? "Generating Proof..." : "Generate Semaphore Proof"}
              </Button>
              {proofResult && (
                <Button variant="secondary" type="button" onClick={handleSimulateVote}>
                  Simulate Vote (Local)
                </Button>
              )}
            </div>
            {statusMsg && <Notice tone={proofResult?.upstreamValid ? "mint" : "info"}>{statusMsg}</Notice>}
          </div>

          <div>
            <div className="veil-label">Local Poll Tallies</div>
            <div className="veil-table-wrap">
              <table className="veil-table">
                <thead>
                  <tr><th>Option</th><th>Simulated Votes</th></tr>
                </thead>
                <tbody>
                  {activePoll.options.map((o, i) => (
                    <tr key={o}>
                      <td>[{i}] {o}</td>
                      <td className="mono">{activePoll.tallies[i]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
