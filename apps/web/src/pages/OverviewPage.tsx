import React from "react";
import { Link } from "react-router-dom";
import { useStudio } from "../app/StudioContext";
import { Panel } from "../components/Panel";
import { StatusBadge } from "../components/StatusBadge";
import { DEPLOYED_PACKAGES, CIRCUIT_CATALOG } from "../services/catalog";

export function OverviewPage() {
  const { onyxStatus, onyxNetwork, onyxHeight, registryRecords, poll1, relayerHealth, relayerError } = useStudio();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 28, marginBottom: 6 }}>Studio Overview</h1>
        <p style={{ margin: 0, color: "var(--veil-muted)" }}>
          Live Onyx testnet telemetry, deployed cryptographic packages, and developer workflows.
        </p>
      </div>

      <div className="veil-grid-3">
        <Panel title="Onyx Network" subtitle="Direct RPC /status">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span className="mono" style={{ fontSize: 18, fontWeight: 600 }}>
              {onyxHeight ? `#${onyxHeight.toLocaleString()}` : "—"}
            </span>
            <StatusBadge tone={onyxStatus === "ready" ? "mint" : onyxStatus === "unavailable" ? "rose" : "amber"}>
              {onyxStatus === "ready" ? onyxNetwork : onyxStatus}
            </StatusBadge>
          </div>
          <div style={{ marginTop: 12, fontSize: 12.5, color: "var(--veil-subtle)" }}>
            <Link to="/studio/network">View network &amp; deployments →</Link>
          </div>
        </Panel>

        <Panel title="Verifier Registry" subtitle="veil_registry/v1">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span className="mono" style={{ fontSize: 18, fontWeight: 600 }}>
              {registryRecords.length} records
            </span>
            <StatusBadge tone={registryRecords.length > 0 ? "mint" : "neutral"}>
              {registryRecords.length > 0 ? "Live RPC" : "Not synced"}
            </StatusBadge>
          </div>
          <div style={{ marginTop: 12, fontSize: 12.5, color: "var(--veil-subtle)" }}>
            <Link to="/studio/registry">Browse registered verifiers →</Link>
          </div>
        </Panel>

        <Panel title="Sponsored Relayer" subtitle="Railway /ready">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span className="mono" style={{ fontSize: 18, fontWeight: 600 }}>
              {relayerHealth ? `${(relayerHealth.dailyBudgetUgnot - relayerHealth.spentUgnotToday).toLocaleString()} ugnot` : "—"}
            </span>
            <StatusBadge tone={relayerHealth?.ready ? "mint" : relayerError ? "rose" : "amber"}>
              {relayerHealth?.ready ? "Ready" : relayerError ? "Unavailable" : "Checking"}
            </StatusBadge>
          </div>
          <div style={{ marginTop: 12, fontSize: 12.5, color: "var(--veil-subtle)" }}>
            <Link to="/studio/showcase/vote">View Veil Vote (Onyx) →</Link>
          </div>
        </Panel>
      </div>

      <div className="veil-grid-2">
        <Panel title="Developer Workflows" subtitle="Build, verify, and deploy custom Groth16 verifiers">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Link to="/studio/circuits" className="veil-panel-raised" style={{ display: "block", color: "inherit" }}>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>1. Circuit Explorer ({CIRCUIT_CATALOG.length} circuits)</div>
              <div style={{ fontSize: 13, color: "var(--veil-muted)" }}>Inspect BN254 Groth16 circuits, setup provenance, and GnoVM gas.</div>
            </Link>
            <Link to="/studio/forge" className="veil-panel-raised" style={{ display: "block", color: "inherit" }}>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>2. Veil Forge</div>
              <div style={{ fontSize: 13, color: "var(--veil-muted)" }}>Convert snarkjs verification_key.json into a Gno verifier realm.</div>
            </Link>
            <Link to="/studio/playground" className="veil-panel-raised" style={{ display: "block", color: "inherit" }}>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>3. Proof Playground</div>
              <div style={{ fontSize: 13, color: "var(--veil-muted)" }}>Verify proofs in-browser with snarkjs and inspect EIP-197 encodings.</div>
            </Link>
          </div>
        </Panel>

        <Panel title="Frozen Core &amp; Historical Vote" subtitle="Onyx V1 RC2 infrastructure">
          <p style={{ marginTop: 0, color: "var(--veil-muted)", fontSize: 13.5 }}>
            {DEPLOYED_PACKAGES.length} core packages are deployed on <code className="mono">onyx-1</code>.
            {poll1 ? ` Historical Poll #1 has ${poll1.commitments.length} snapshot members (Yes=${poll1.tallies[0]}, No=${poll1.tallies[1]}).` : ""}
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            <Link to="/studio/sandbox" className="veil-btn veil-btn-primary">
              Try Local Sandbox
            </Link>
            <Link to="/studio/showcase/vote" className="veil-btn veil-btn-secondary">
              Inspect Poll #1
            </Link>
          </div>
        </Panel>
      </div>
    </div>
  );
}
