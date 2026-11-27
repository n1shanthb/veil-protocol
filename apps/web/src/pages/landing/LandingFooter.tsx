import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export function LandingFooter() {
  return (
    <footer style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 64px" }}>
      {/* Final CTA */}
      <div
        style={{
          position: "relative",
          background: "linear-gradient(135deg, #0E1F17 0%, #080C0A 100%)",
          border: "1px solid var(--veil-lineStrong)",
          borderRadius: 24,
          padding: "64px 32px",
          textAlign: "center",
          overflow: "hidden",
          marginBottom: 56,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(circle at 50% 0%, rgba(0, 232, 157, 0.16), transparent 65%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", zIndex: 2 }}>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 46px)", marginBottom: 16 }}>
            The next Gno application starts here.
          </h2>
          <p style={{ color: "var(--veil-muted)", fontSize: 16, maxWidth: 520, margin: "0 auto 28px" }}>
            Open Veil Studio to inspect circuits, generate Gno verifiers, and test proofs on Onyx.
          </p>
          <Link to="/studio" className="veil-btn veil-btn-primary" style={{ padding: "13px 26px", fontSize: 15, borderRadius: 999 }}>
            Launch Veil Studio <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {/* Structured Footer */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 32,
          paddingTop: 32,
          borderTop: "1px solid var(--veil-line)",
          fontSize: 13.5,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <img src="/assets/brand/veil-mark.svg" alt="Veil" width={20} height={20} />
            <span style={{ fontFamily: "var(--veil-font-display)", fontWeight: 700, letterSpacing: "0.08em" }}>VEIL</span>
          </div>
          <p style={{ color: "var(--veil-subtle)", margin: 0 }}>
            Zero-knowledge verifier infrastructure for Gno.land (onyx-1).
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Studio</div>
          <Link to="/studio" style={{ color: "var(--veil-muted)" }}>Overview</Link>
          <Link to="/studio/circuits" style={{ color: "var(--veil-muted)" }}>Circuit Explorer</Link>
          <Link to="/studio/forge" style={{ color: "var(--veil-muted)" }}>Veil Forge</Link>
          <Link to="/studio/playground" style={{ color: "var(--veil-muted)" }}>Proof Playground</Link>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Network &amp; Apps</div>
          <Link to="/studio/registry" style={{ color: "var(--veil-muted)" }}>Verifier Registry</Link>
          <Link to="/studio/network" style={{ color: "var(--veil-muted)" }}>Network &amp; Deployments</Link>
          <Link to="/studio/showcase/vote" style={{ color: "var(--veil-muted)" }}>Veil Vote (Onyx)</Link>
          <Link to="/studio/sandbox" style={{ color: "var(--veil-muted)" }}>Local Sandbox</Link>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Developers</div>
          <Link to="/docs" style={{ color: "var(--veil-muted)" }}>Documentation</Link>
          <Link to="/docs/operators" style={{ color: "var(--veil-muted)" }}>Operator Guide</Link>
          <a href="https://github.com/n1shanthb/veil-protocol" target="_blank" rel="noopener noreferrer" style={{ color: "var(--veil-muted)" }}>
            GitHub Repository ↗
          </a>
        </div>
      </div>
    </footer>
  );
}
