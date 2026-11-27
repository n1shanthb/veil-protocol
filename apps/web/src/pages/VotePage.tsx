import React from "react";
import { Link } from "react-router-dom";
import { useStudio } from "../app/StudioContext";
import { EXPLORER_BASE, VOTE_REALM_PATH } from "../veil-browser";
import { Panel } from "../components/Panel";
import { StatusBadge } from "../components/StatusBadge";
import { Notice } from "../components/Notice";
import { Button } from "../components/Button";

export function VotePage() {
  const { poll1, onyxStatus, onyxError, relayerHealth, refreshAll } = useStudio();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 28, marginBottom: 6 }}>Veil Vote — Onyx Poll #1</h1>
          <p style={{ margin: 0, color: "var(--veil-muted)" }}>
            Live on-chain state from <code className="mono">{VOTE_REALM_PATH}</code>.
          </p>
        </div>
        <Button variant="secondary" type="button" onClick={refreshAll} disabled={onyxStatus === "loading"}>
          {onyxStatus === "loading" ? "Syncing..." : "Sync Live Onyx State"}
        </Button>
      </div>

      <Notice tone="warn" title="Historical Frozen Snapshot">
        Poll #1 has a frozen 3-member snapshot and all 3 members have already cast their votes on-chain. New visitors cannot enroll in Poll #1. To test identity creation, group enrollment, and real browser proof generation, use the{" "}
        <Link to="/studio/sandbox" style={{ fontWeight: 600 }}>Local Sandbox</Link>.
      </Notice>

      {onyxError && <Notice tone="error" title="Onyx RPC Error">{onyxError}</Notice>}

      <div className="veil-grid-2">
        <Panel
          title="Poll #1 Tallies"
          action={<StatusBadge tone="amber">Read-Only Historical</StatusBadge>}
        >
          {poll1 ? (
            <div className="veil-table-wrap">
              <table className="veil-table">
                <thead>
                  <tr>
                    <th>Option</th>
                    <th>On-Chain Votes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>[0] Yes</td>
                    <td className="mono" style={{ fontWeight: 600 }}>{poll1.tallies[0]}</td>
                  </tr>
                  <tr>
                    <td>[1] No</td>
                    <td className="mono" style={{ fontWeight: 600 }}>{poll1.tallies[1]}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ color: "var(--veil-muted)" }}>Syncing Poll #1 state from Onyx...</div>
          )}
        </Panel>

        <Panel title="Snapshot &amp; Relayer Status">
          <dl style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: "10px 12px", margin: 0, fontSize: 13 }}>
            <dt style={{ color: "var(--veil-subtle)" }}>Snapshot Members</dt>
            <dd className="mono" style={{ margin: 0 }}>{poll1 ? poll1.commitments.length : "—"}</dd>
            <dt style={{ color: "var(--veil-subtle)" }}>Reconstructed Root</dt>
            <dd className="mono" style={{ margin: 0, wordBreak: "break-all" }}>{poll1 ? poll1.rootHex : "—"}</dd>
            <dt style={{ color: "var(--veil-subtle)" }}>Relayer Ready</dt>
            <dd style={{ margin: 0 }}>
              <StatusBadge tone={relayerHealth?.ready ? "mint" : "rose"}>
                {relayerHealth?.ready ? "Ready" : "Unavailable"}
              </StatusBadge>
            </dd>
          </dl>
          <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link to="/studio/sandbox" className="veil-btn veil-btn-primary">
              Try Local Sandbox
            </Link>
            <a
              href={`${EXPLORER_BASE}/${VOTE_REALM_PATH.replace(/^gno\.land\//, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="veil-btn veil-btn-secondary"
            >
              View Realm on Explorer ↗
            </a>
          </div>
        </Panel>
      </div>

      {poll1 && (
        <Panel title={`Frozen Snapshot Commitments (${poll1.commitments.length})`}>
          <pre className="mono" style={{ margin: 0, fontSize: 12.5, overflowX: "auto", color: "var(--veil-muted)" }}>
            {poll1.commitments.map((c, i) => `[${i}] ${c}`).join("\n")}
          </pre>
        </Panel>
      )}
    </div>
  );
}
