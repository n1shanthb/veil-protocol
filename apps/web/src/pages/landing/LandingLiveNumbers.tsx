import React from "react";
import { useStudio } from "../../app/StudioContext";
import { DEPLOYED_PACKAGES } from "../../services/catalog";

export function LandingLiveNumbers() {
  const { onyxStatus, onyxHeight, registryRecords, relayerHealth } = useStudio();

  const metrics = [
    {
      label: "Onyx Block Height",
      value: onyxStatus === "ready" && onyxHeight ? `#${onyxHeight.toLocaleString()}` : "Unavailable",
      sub: onyxStatus === "ready" ? "Live RPC /status (onyx-1)" : "RPC unreachable",
    },
    {
      label: "Registry Records",
      value: onyxStatus === "ready" ? String(registryRecords.length) : "Unavailable",
      sub: "veil_registry/v1 (live)",
    },
    {
      label: "Frozen Core Packages",
      value: `${DEPLOYED_PACKAGES.length} Active`,
      sub: "Historical V1 RC2 manifest",
    },
    {
      label: "Sponsored Relayer",
      value: relayerHealth?.ready ? "Ready" : "Unavailable",
      sub: relayerHealth
        ? `${(relayerHealth.dailyBudgetUgnot - relayerHealth.spentUgnotToday).toLocaleString()} ugnot remaining`
        : "Railway /ready",
    },
  ];

  return (
    <section id="network" style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 24px 80px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 18 }}>
        {metrics.map((m) => (
          <div
            key={m.label}
            style={{
              background: "var(--veil-surface)",
              border: "1px solid var(--veil-line)",
              borderRadius: 16,
              padding: 24,
            }}
          >
            <div style={{ fontSize: 12.5, color: "var(--veil-subtle)", marginBottom: 8 }}>{m.label}</div>
            <div className="mono" style={{ fontSize: 28, fontWeight: 700, color: "var(--veil-text)", marginBottom: 6 }}>
              {m.value}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--veil-muted)" }}>{m.sub}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
