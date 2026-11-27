import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStudio } from "../app/StudioContext";
import { REGISTRY_REALM_PATH } from "../veil-browser";
import { Panel } from "../components/Panel";
import { StatusBadge } from "../components/StatusBadge";
import { Button } from "../components/Button";
import { Notice } from "../components/Notice";

export function RegistryPage() {
  const { registryRecords, onyxStatus, onyxError, refreshAll } = useStudio();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return registryRecords;
    return registryRecords.filter(
      (r) =>
        r.pkgPath.toLowerCase().includes(q) ||
        r.vkFingerprint.toLowerCase().includes(q) ||
        String(r.id) === q
    );
  }, [registryRecords, search]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 28, marginBottom: 6 }}>Verifier Registry</h1>
          <p style={{ margin: 0, color: "var(--veil-muted)" }}>
            Live on-chain records from <code className="mono">{REGISTRY_REALM_PATH}</code>.
          </p>
        </div>
        <Button variant="secondary" type="button" onClick={refreshAll} disabled={onyxStatus === "loading"}>
          {onyxStatus === "loading" ? "Syncing..." : "Refresh Registry"}
        </Button>
      </div>

      <Notice tone="info" title="Publisher-Declared Metadata">
        Registry entries are self-declared by each publisher. Availability on Onyx and independent VK/source verification are separate checks.
      </Notice>

      {onyxError && <Notice tone="error" title="Onyx RPC Error">{onyxError}</Notice>}

      <Panel>
        <div style={{ marginBottom: 16 }}>
          <label className="veil-label" htmlFor="reg-search">Filter by package path, VK fingerprint, or ID</label>
          <input
            id="reg-search"
            className="veil-input"
            placeholder="e.g. cubic_check or square_diff..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="veil-table-wrap">
          <table className="veil-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Package Path</th>
                <th>Proof System</th>
                <th>Public Inputs</th>
                <th>Version</th>
                <th>Declared Status</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className="mono">#{r.id}</td>
                  <td className="mono" style={{ maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {r.pkgPath}
                  </td>
                  <td className="mono">{r.proofSystem}</td>
                  <td className="mono">{r.publicInputs}</td>
                  <td className="mono">{r.version}</td>
                  <td>
                    <StatusBadge tone={r.status === "active" ? "mint" : "neutral"}>
                      {r.status}
                    </StatusBadge>
                  </td>
                  <td>
                    <Link to={`/studio/registry/${r.id}`} className="veil-btn veil-btn-secondary" style={{ minHeight: 32, padding: "4px 12px", fontSize: 12.5 }}>
                      Inspect
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", color: "var(--veil-muted)", padding: 24 }}>
                    {onyxStatus === "loading" ? "Loading registry records from Onyx..." : "No matching registry records."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
