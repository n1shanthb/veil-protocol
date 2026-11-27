import React from "react";
import { Link } from "react-router-dom";
import { useStudio } from "../app/StudioContext";
import { Panel } from "../components/Panel";
import { StatusBadge } from "../components/StatusBadge";

export function ShowcasePage() {
  const { poll1 } = useStudio();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <h1 style={{ fontSize: 28, marginBottom: 6 }}>Veil Vote Showcase</h1>
        <p style={{ margin: 0, color: "var(--veil-muted)" }}>
          Anonymous group membership voting powered by Semaphore v4 and <code className="mono">veil_vote/v3</code>.
        </p>
      </div>

      <div className="veil-grid-2">
        <Panel
          title="Onyx Live Poll #1 (Historical)"
          subtitle="veil_vote/v3 on onyx-1"
          action={<StatusBadge tone="amber">Frozen Snapshot</StatusBadge>}
        >
          <p style={{ marginTop: 0, color: "var(--veil-muted)", fontSize: 13.5 }}>
            Inspect live on-chain tallies, snapshot commitments, and LeanIMT root reconstruction from Onyx.
            {poll1 ? ` Current tally: Yes=${poll1.tallies[0]}, No=${poll1.tallies[1]} (${poll1.commitments.length} members).` : ""}
          </p>
          <Link to="/studio/showcase/vote" className="veil-btn veil-btn-secondary">
            Inspect Onyx Poll #1 →
          </Link>
        </Panel>

        <Panel
          title="Local Voting Sandbox"
          subtitle="Browser-local Semaphore v4 simulation"
          action={<StatusBadge tone="mint">Interactive</StatusBadge>}
        >
          <p style={{ marginTop: 0, color: "var(--veil-muted)", fontSize: 13.5 }}>
            Create a fresh Semaphore identity, join a simulated group, create polls, generate real Groth16 proofs in-browser, and test duplicate-nullifier rejection.
          </p>
          <Link to="/studio/sandbox" className="veil-btn veil-btn-primary">
            Open Local Sandbox →
          </Link>
        </Panel>
      </div>
    </div>
  );
}
