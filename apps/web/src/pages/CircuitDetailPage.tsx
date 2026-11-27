import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CIRCUIT_CATALOG } from "../services/catalog";
import { useStudio } from "../app/StudioContext";
import { Panel } from "../components/Panel";
import { StatusBadge } from "../components/StatusBadge";
import { Button } from "../components/Button";

export function CircuitDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setForgeDraftVk } = useStudio();
  const circuit = CIRCUIT_CATALOG.find((c) => c.id === id);

  if (!circuit) {
    return (
      <Panel title="Circuit Not Found">
        <p style={{ color: "var(--veil-muted)" }}>No circuit with ID "{id}" exists in the catalogue.</p>
        <Link to="/studio/circuits" className="veil-btn veil-btn-secondary">Back to Circuit Explorer</Link>
      </Panel>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 12.5, color: "var(--veil-subtle)", marginBottom: 6 }}>
            <Link to="/studio/circuits">Circuit Explorer</Link> / {circuit.id}
          </div>
          <h1 style={{ fontSize: 28, marginBottom: 6 }}>{circuit.name}</h1>
          <p style={{ margin: 0, color: "var(--veil-muted)" }}>{circuit.description}</p>
        </div>
        <StatusBadge tone={circuit.ceremonyBacked ? "mint" : "amber"}>
          {circuit.setupProvenance}
        </StatusBadge>
      </div>

      <div className="veil-grid-2">
        <Panel title="Specification">
          <dl style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "10px 14px", margin: 0, fontSize: 13.5 }}>
            <dt style={{ color: "var(--veil-subtle)" }}>Protocol</dt>
            <dd className="mono" style={{ margin: 0 }}>Groth16 (BN254)</dd>
            <dt style={{ color: "var(--veil-subtle)" }}>Public Inputs</dt>
            <dd className="mono" style={{ margin: 0 }}>{circuit.publicInputsCount} [{circuit.publicSignals.join(", ")}]</dd>
            <dt style={{ color: "var(--veil-subtle)" }}>Local GnoVM Gas</dt>
            <dd className="mono" style={{ margin: 0 }}>{circuit.localVerifyGas}</dd>
            <dt style={{ color: "var(--veil-subtle)" }}>Source Path</dt>
            <dd className="mono" style={{ margin: 0, wordBreak: "break-all" }}>{circuit.sourcePath}</dd>
            {circuit.onChainRealm && (
              <>
                <dt style={{ color: "var(--veil-subtle)" }}>On-Chain Realm</dt>
                <dd className="mono" style={{ margin: 0, wordBreak: "break-all" }}>{circuit.onChainRealm}</dd>
              </>
            )}
          </dl>
        </Panel>

        <Panel title="Artifacts &amp; Actions">
          <p style={{ marginTop: 0, color: "var(--veil-muted)", fontSize: 13.5 }}>{circuit.artifactsNote}</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
            <Button
              variant="primary"
              type="button"
              onClick={() => {
                if (circuit.sampleVk) setForgeDraftVk(JSON.stringify(circuit.sampleVk, null, 2));
                navigate("/studio/forge");
              }}
            >
              Open in Forge
            </Button>
            <Button
              variant="secondary"
              type="button"
              onClick={() => navigate("/studio/playground")}
            >
              Open in Playground
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
