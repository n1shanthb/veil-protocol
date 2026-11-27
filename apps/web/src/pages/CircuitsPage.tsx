import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CIRCUIT_CATALOG } from "../services/catalog";
import { Panel } from "../components/Panel";
import { StatusBadge } from "../components/StatusBadge";

export function CircuitsPage() {
  const [query, setQuery] = useState("");
  const [provenanceFilter, setProvenanceFilter] = useState<"all" | "ceremony" | "dev">("all");

  const filtered = useMemo(() => {
    return CIRCUIT_CATALOG.filter((c) => {
      const matchesQuery =
        !query.trim() ||
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.description.toLowerCase().includes(query.toLowerCase());
      const matchesProv =
        provenanceFilter === "all" ||
        (provenanceFilter === "ceremony" && c.ceremonyBacked) ||
        (provenanceFilter === "dev" && !c.ceremonyBacked);
      return matchesQuery && matchesProv;
    });
  }, [query, provenanceFilter]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <h1 style={{ fontSize: 28, marginBottom: 6 }}>Circuit Explorer</h1>
        <p style={{ margin: 0, color: "var(--veil-muted)" }}>
          Supported BN254 Groth16 circuits verified through <code className="mono">groth16/v2</code>.
        </p>
      </div>

      <Panel>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
          <div style={{ flex: "1 1 240px" }}>
            <label className="veil-label" htmlFor="circuit-search">Search circuits</label>
            <input
              id="circuit-search"
              className="veil-input"
              placeholder="Filter by name or description..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div style={{ width: 200 }}>
            <label className="veil-label" htmlFor="circuit-prov">Setup provenance</label>
            <select
              id="circuit-prov"
              className="veil-select"
              value={provenanceFilter}
              onChange={(e) => setProvenanceFilter(e.target.value as any)}
            >
              <option value="all">All provenance</option>
              <option value="ceremony">Ceremony-Backed (PSE)</option>
              <option value="dev">Dev-Only (pot12)</option>
            </select>
          </div>
        </div>

        <div className="veil-table-wrap">
          <table className="veil-table">
            <thead>
              <tr>
                <th>Circuit</th>
                <th>Curve / Protocol</th>
                <th>Public Inputs</th>
                <th>Setup Provenance</th>
                <th>Local GnoVM Gas</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/studio/circuits/${c.id}`} style={{ fontWeight: 600 }}>
                      {c.name}
                    </Link>
                    <div style={{ fontSize: 12, color: "var(--veil-subtle)" }}>{c.sourcePath}</div>
                  </td>
                  <td className="mono">BN254 / Groth16</td>
                  <td className="mono">
                    {c.publicInputsCount} ({c.publicSignals.join(", ")})
                  </td>
                  <td>
                    <StatusBadge tone={c.ceremonyBacked ? "mint" : "amber"}>
                      {c.setupProvenance}
                    </StatusBadge>
                  </td>
                  <td className="mono">{c.localVerifyGas}</td>
                  <td>
                    <Link to={`/studio/circuits/${c.id}`} className="veil-btn veil-btn-secondary" style={{ minHeight: 32, padding: "4px 12px", fontSize: 12.5 }}>
                      Inspect
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "var(--veil-muted)", padding: 24 }}>
                    No circuits match your filter.
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
