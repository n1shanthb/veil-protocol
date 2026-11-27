import React from "react";

const STACK = [
  { name: "Gno.land", desc: "Deterministic GnoVM smart contract realms on Onyx (onyx-1)." },
  { name: "Groth16 / BN254", desc: "Succinct pairings verified via Gno native crypto/bn254." },
  { name: "Circom", desc: "Arithmetic constraint circuits compiled to WASM & R1CS." },
  { name: "snarkjs", desc: "Browser-local witness calculation, proving, and verification." },
  { name: "Semaphore v4", desc: "LeanIMT group membership and scoped nullifier primitives." },
  { name: "TypeScript SDK", desc: "Canonical EIP-197 encoding and gnokey argument builders." },
];

export function LandingBuiltOn() {
  return (
    <section style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 24px 88px" }}>
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <span className="veil-badge veil-badge-mint" style={{ marginBottom: 12 }}>Ecosystem</span>
        <h2 style={{ fontSize: "clamp(26px, 3.2vw, 38px)" }}>Built on Proven Primitives</h2>
      </div>

      <div className="veil-grid-3">
        {STACK.map((item) => (
          <div
            key={item.name}
            style={{
              background: "var(--veil-surface)",
              border: "1px solid var(--veil-line)",
              borderRadius: 16,
              padding: 22,
            }}
          >
            <h3 style={{ fontSize: 17, marginBottom: 8, color: "var(--veil-text)" }}>{item.name}</h3>
            <p style={{ margin: 0, fontSize: 13.5, color: "var(--veil-muted)", lineHeight: 1.6 }}>{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
