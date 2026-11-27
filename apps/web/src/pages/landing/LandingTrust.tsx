import React, { useState } from "react";
import { Shield, Lock, Cpu, AlertTriangle, CheckCircle2, Server } from "lucide-react";

const PRINCIPLES = [
  {
    id: "browser",
    icon: Lock,
    title: "Browser-local cryptographic computation",
    detail: "Private identity seeds, witnesses, and proof generation execute strictly in browser memory. Secrets are never sent to the relayer or stored in URLs.",
  },
  {
    id: "bn254",
    icon: Cpu,
    title: "Native Gno BN254 verification",
    detail: "groth16/v2 uses Gno's native crypto/bn254 pairing engine with strict canonical field checks (< p and < r) and EIP-197 G2 ordering.",
  },
  {
    id: "nullifier",
    icon: Shield,
    title: "Replay protection through nullifiers",
    detail: "semaphore/v2 derives domain-separated scopes and atomically consumes nullifiers on-chain, preventing duplicate votes within a poll.",
  },
  {
    id: "provenance",
    icon: CheckCircle2,
    title: "Transparent setup provenance",
    detail: "Veil distinguishes ceremony-backed Semaphore artifacts (PSE) from dev-only pot12 example circuits. No ceremony is claimed without verification.",
  },
  {
    id: "root",
    icon: AlertTriangle,
    title: "Trusted root publisher limitation",
    detail: "veil_vote/v3 relies on an authorized RootPublisher to enroll commitments and publish frozen snapshots. Public vote options are visible on-chain.",
  },
  {
    id: "relayer",
    icon: Server,
    title: "Sponsored transaction boundaries",
    detail: "The Railway relayer only accepts POST /api/relay/vote for onyx-1 and veil_vote/v3, enforces a 10M ugnot daily cap, and never exposes signing keys.",
  },
];

export function LandingTrust() {
  const [activeId, setActiveId] = useState(PRINCIPLES[0].id);
  const active = PRINCIPLES.find((p) => p.id === activeId) || PRINCIPLES[0];
  const ActiveIcon = active.icon;

  return (
    <section style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 24px 88px" }}>
      <div style={{ marginBottom: 32 }}>
        <span className="veil-badge veil-badge-mint" style={{ marginBottom: 12 }}>Security Model</span>
        <h2 style={{ fontSize: "clamp(26px, 3.2vw, 38px)" }}>Explicit Guarantees &amp; Boundaries</h2>
      </div>

      <div className="veil-split-layout">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {PRINCIPLES.map((p) => {
            const selected = p.id === activeId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setActiveId(p.id)}
                style={{
                  textAlign: "left",
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: `1px solid ${selected ? "var(--veil-brand)" : "var(--veil-line)"}`,
                  background: selected ? "var(--veil-selected)" : "var(--veil-surface)",
                  color: selected ? "var(--veil-mint)" : "var(--veil-text)",
                  fontWeight: selected ? 600 : 500,
                  fontSize: 14,
                  cursor: "pointer",
                  transition: "all 120ms ease",
                }}
              >
                {p.title}
              </button>
            );
          })}
        </div>

        <div
          style={{
            background: "var(--veil-surface)",
            border: "1px solid var(--veil-lineStrong)",
            borderRadius: 18,
            padding: 28,
            minHeight: 260,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(0, 232, 157, 0.1)",
                border: "1px solid rgba(0, 232, 157, 0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--veil-brand)",
                marginBottom: 18,
              }}
            >
              <ActiveIcon size={20} />
            </div>
            <h3 style={{ fontSize: 20, marginBottom: 12 }}>{active.title}</h3>
            <p style={{ margin: 0, color: "var(--veil-muted)", fontSize: 14.5, lineHeight: 1.65 }}>
              {active.detail}
            </p>
          </div>
          <div className="mono" style={{ fontSize: 11.5, color: "var(--veil-subtle)", marginTop: 24 }}>
            Verified against groth16/v2 • semaphore/v2 • veil_vote/v3
          </div>
        </div>
      </div>
    </section>
  );
}
