import React from "react";
import { useStudio } from "../app/StudioContext";
import { DEPLOYED_PACKAGES } from "../services/catalog";
import { ONYX_RPC } from "../veil-browser";
import { RELAYER_URL } from "../services/relayer";
import { Panel } from "../components/Panel";
import { StatusBadge } from "../components/StatusBadge";
import { Button } from "../components/Button";

export function NetworkPage() {
  const { onyxStatus, onyxNetwork, onyxHeight, onyxBuild, onyxError, relayerHealth, relayerError, refreshAll } = useStudio();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 28, marginBottom: 6 }}>Network &amp; Deployments</h1>
          <p style={{ margin: 0, color: "var(--veil-muted)" }}>
            Live Onyx RPC status, Railway relayer readiness, and frozen V1 RC2 package deployment evidence.
          </p>
        </div>
        <Button variant="secondary" type="button" onClick={refreshAll} disabled={onyxStatus === "loading"}>
          {onyxStatus === "loading" ? "Syncing..." : "Refresh Status"}
        </Button>
      </div>

      <div className="veil-grid-2">
        <Panel title="Onyx Testnet RPC" subtitle={ONYX_RPC}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <StatusBadge tone={onyxStatus === "ready" ? "mint" : onyxStatus === "unavailable" ? "rose" : "amber"}>
              {onyxStatus === "ready" ? "Online" : onyxStatus}
            </StatusBadge>
            <span className="mono" style={{ fontSize: 13 }}>
              {onyxNetwork} {onyxHeight ? `@ #${onyxHeight}` : ""} {onyxBuild ? `(${onyxBuild})` : ""}
            </span>
          </div>
          {onyxError && <div style={{ color: "var(--veil-error)", fontSize: 13 }}>{onyxError}</div>}
        </Panel>

        <Panel title="Sponsored Relayer" subtitle={RELAYER_URL}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <StatusBadge tone={relayerHealth?.ready ? "mint" : relayerError ? "rose" : "amber"}>
              {relayerHealth?.ready ? "Ready" : relayerError ? "Unavailable" : "Checking"}
            </StatusBadge>
            {relayerHealth && (
              <span className="mono" style={{ fontSize: 13 }}>
                Spent today: {relayerHealth.spentUgnotToday.toLocaleString()} / {relayerHealth.dailyBudgetUgnot.toLocaleString()} ugnot
              </span>
            )}
          </div>
          {relayerError && <div style={{ color: "var(--veil-error)", fontSize: 13 }}>{relayerError}</div>}
        </Panel>
      </div>

      <Panel title="Historical V1 RC2 Package Deployments" subtitle="Frozen cryptographic packages on onyx-1">
        <div className="veil-table-wrap">
          <table className="veil-table">
            <thead>
              <tr>
                <th>Package</th>
                <th>Role</th>
                <th>Height</th>
                <th>Tx Hash</th>
                <th>Gas Used</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              {DEPLOYED_PACKAGES.map((pkg) => (
                <tr key={pkg.pkgPath}>
                  <td className="mono" style={{ fontWeight: 600 }}>{pkg.shortName}</td>
                  <td>{pkg.role}</td>
                  <td className="mono">{pkg.height}</td>
                  <td className="mono" style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }} title={pkg.txHash}>
                    {pkg.txHash}
                  </td>
                  <td className="mono">{pkg.gasUsed}</td>
                  <td>
                    <a href={pkg.explorerUrl} target="_blank" rel="noopener noreferrer">
                      Explorer ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
