import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

export function LandingHeader() {
  return (
    <header
      style={{
        position: "fixed",
        top: 18,
        left: 0,
        right: 0,
        zIndex: 50,
        display: "flex",
        justifyContent: "center",
        padding: "0 16px",
        pointerEvents: "none",
      }}
    >
      <nav
        aria-label="Primary"
        style={{
          pointerEvents: "auto",
          display: "flex",
          alignItems: "center",
          gap: 20,
          padding: "8px 10px 8px 16px",
          borderRadius: 999,
          background: "rgba(12, 16, 14, 0.78)",
          border: "1px solid var(--veil-lineStrong)",
          backdropFilter: "blur(16px)",
          boxShadow: "0 12px 40px rgba(0, 0, 0, 0.45)",
          maxWidth: "100%",
          overflowX: "auto",
        }}
      >
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--veil-text)", flexShrink: 0 }}>
          <img src="/assets/brand/veil-mark.svg" alt="Veil" width={22} height={22} />
          <span style={{ fontFamily: "var(--veil-font-display)", fontWeight: 700, fontSize: 14, letterSpacing: "0.08em" }}>
            VEIL
          </span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 13.5, color: "var(--veil-muted)", flexShrink: 0 }}>
          <a href="#platform" style={{ color: "inherit" }}>Platform</a>
          <a href="#how-it-works" style={{ color: "inherit" }}>How it works</a>
          <a href="#network" style={{ color: "inherit" }}>Network</a>
          <Link to="/docs" style={{ color: "inherit" }}>Docs</Link>
          <a
            href="https://github.com/n1shanthb/veil-protocol"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "inherit", display: "inline-flex", alignItems: "center", gap: 3 }}
          >
            GitHub <ArrowUpRight size={13} />
          </a>
        </div>

        <Link
          to="/studio"
          className="veil-btn veil-btn-primary"
          style={{
            borderRadius: 999,
            minHeight: 34,
            padding: "6px 16px",
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          Launch Studio
        </Link>
      </nav>
    </header>
  );
}
