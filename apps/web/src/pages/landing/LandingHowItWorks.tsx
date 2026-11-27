import React from "react";

const CHAPTERS = [
  {
    step: "01",
    title: "Build",
    desc: "Import any snarkjs Groth16/BN254 verification key and generate a Gno verifier realm with EIP-197 imaginary-first G2 encoding.",
    preview: (
      <div className="mono" style={{ background: "var(--veil-bg)", border: "1px solid var(--veil-line)", borderRadius: 10, padding: 12, fontSize: 11.5, color: "var(--veil-mint)" }}>
        <div>func Verify(cur realm, aHex, bHex, cHex, inputsCSV string) string</div>
        <div style={{ color: "var(--veil-subtle)", marginTop: 4 }}>// imports groth16/v2</div>
      </div>
    ),
  },
  {
    step: "02",
    title: "Prove",
    desc: "Generate genuine zero-knowledge proofs in-browser using verified WASM/zkey artifacts without exposing private witnesses.",
    preview: (
      <div style={{ background: "var(--veil-bg)", border: "1px solid var(--veil-line)", borderRadius: 10, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
        <span className="mono" style={{ color: "var(--veil-muted)" }}>semaphore-10.wasm</span>
        <span className="veil-badge veil-badge-mint">SHA-256 Verified</span>
      </div>
    ),
  },
  {
    step: "03",
    title: "Verify",
    desc: "Validate proofs locally with snarkjs before broadcasting, then inspect exact GnoVM / Onyx CLI call arguments.",
    preview: (
      <div style={{ background: "var(--veil-bg)", border: "1px solid var(--veil-line)", borderRadius: 10, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
        <span style={{ color: "var(--veil-muted)" }}>Pairing Check</span>
        <span className="mono" style={{ color: "var(--veil-brand)", fontWeight: 600 }}>VALID</span>
      </div>
    ),
  },
  {
    step: "04",
    title: "Deploy & Integrate",
    desc: "Export a deployable ZIP bundle, publish your verifier to Onyx via gnokey, and register it in veil_registry/v1.",
    preview: (
      <div className="mono" style={{ background: "var(--veil-bg)", border: "1px solid var(--veil-line)", borderRadius: 10, padding: 12, fontSize: 11.5, color: "var(--veil-muted)" }}>
        gnokey maketx addpkg -chainid onyx-1
      </div>
    ),
  },
];

export function LandingHowItWorks() {
  return (
    <section id="how-it-works" style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px 88px" }}>
      <div
        style={{
          background: "var(--veil-surface)",
          border: "1px solid var(--veil-line)",
          borderRadius: 24,
          padding: "48px 32px",
        }}
      >
        <div style={{ marginBottom: 36 }}>
          <span className="veil-badge veil-badge-mint" style={{ marginBottom: 12 }}>Workflow</span>
          <h2 style={{ fontSize: "clamp(26px, 3.2vw, 38px)" }}>From Circom to Onyx in Four Steps</h2>
        </div>

        <div className="veil-grid-2">
          {CHAPTERS.map((ch) => (
            <div
              key={ch.step}
              style={{
                background: "var(--veil-raised)",
                border: "1px solid var(--veil-line)",
                borderRadius: 16,
                padding: 24,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: 18,
              }}
            >
              <div>
                <div className="mono" style={{ fontSize: 12, color: "var(--veil-brand)", marginBottom: 8 }}>
                  STEP {ch.step}
                </div>
                <h3 style={{ fontSize: 20, marginBottom: 8 }}>{ch.title}</h3>
                <p style={{ margin: 0, color: "var(--veil-muted)", fontSize: 14, lineHeight: 1.6 }}>{ch.desc}</p>
              </div>
              {ch.preview}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
