import React from "react";
import { Link, useParams } from "react-router-dom";
import { useStudio } from "../app/StudioContext";
import { EXPLORER_BASE } from "../veil-browser";
import { Panel } from "../components/Panel";
import { StatusBadge } from "../components/StatusBadge";

export function VerifierDetailPage() {
  const { id } = useParams();
  const { registryRecords } = useStudio();
  const record = registryRecords.find((r) => String(r.id) === id);

  if (!record) {
    return (
      <Panel title="Verifier Record Not Found">
        <p style={{ color: "var(--veil-muted)" }}>Record #{id} was not found in the synced registry list.</p>
        <Link to="/studio/registry" className="veil-btn veil-btn-secondary">Back to Registry</Link>
      </Panel>
    );
  }

  const explorerUrl = `${EXPLORER_BASE}/${record.pkgPath.replace(/^gno\.land\//, "")}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 12.5, color: "var(--veil-subtle)", marginBottom: 6 }}>
            <Link to="/studio/registry">Verifier Registry</Link> / #{record.id}
          </div>
          <h1 style={{ fontSize: 26, marginBottom: 6 }}>Verifier #{record.id}</h1>
        </div>
        <StatusBadge tone={record.status === "active" ? "mint" : "neutral"}>
          Declared: {record.status}
        </StatusBadge>
      </div>

      <Panel title="On-Chain Record">
        <dl style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: "10px 14px", margin: 0, fontSize: 13.5 }}>
          <dt style={{ color: "var(--veil-subtle)" }}>Package Path</dt>
          <dd className="mono" style={{ margin: 0, wordBreak: "break-all" }}>{record.pkgPath}</dd>
          <dt style={{ color: "var(--veil-subtle)" }}>VK Fingerprint</dt>
          <dd className="mono" style={{ margin: 0, wordBreak: "break-all" }}>{record.vkFingerprint}</dd>
          <dt style={{ color: "var(--veil-subtle)" }}>Proof System</dt>
          <dd className="mono" style={{ margin: 0 }}>{record.proofSystem}</dd>
          <dt style={{ color: "var(--veil-subtle)" }}>Public Inputs</dt>
          <dd className="mono" style={{ margin: 0 }}>{record.publicInputs}</dd>
          <dt style={{ color: "var(--veil-subtle)" }}>Version</dt>
          <dd className="mono" style={{ margin: 0 }}>{record.version}</dd>
        </dl>

        <div style={{ marginTop: 18 }}>
          <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="veil-btn veil-btn-secondary">
            View on Onyx Explorer ↗
          </a>
        </div>
      </Panel>
    </div>
  );
}
