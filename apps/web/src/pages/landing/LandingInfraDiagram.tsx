import React from "react";
import { motion } from "framer-motion";
import { FileCode2, Cpu, ShieldCheck, Layers } from "lucide-react";

const NODES = [
  { icon: FileCode2, title: "Circom Artifacts", sub: "WASM • zkey • VK" },
  { icon: Cpu, title: "Veil Forge & Core", sub: "EIP-197 • groth16/v2" },
  { icon: ShieldCheck, title: "Native Gno Verify", sub: "crypto/bn254 pairing" },
  { icon: Layers, title: "Privacy Apps", sub: "veil_vote/v3 • Registry" },
];

export function LandingInfraDiagram() {
  return (
    <section style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px 72px" }}>
      <div
        style={{
          background: "var(--veil-surface)",
          border: "1px solid var(--veil-line)",
          borderRadius: 24,
          padding: "48px 32px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <span className="veil-badge veil-badge-mint" style={{ marginBottom: 12 }}>Architecture</span>
          <h2 style={{ fontSize: "clamp(24px, 3vw, 34px)" }}>End-to-End Verification Pipeline</h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: 18,
            position: "relative",
            zIndex: 2,
          }}
        >
          {NODES.map((node, i) => {
            const Icon = node.icon;
            return (
              <motion.div
                key={node.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                style={{
                  background: "var(--veil-raised)",
                  border: "1px solid var(--veil-lineStrong)",
                  borderRadius: 14,
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: "rgba(0, 232, 157, 0.1)",
                    border: "1px solid rgba(0, 232, 157, 0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--veil-brand)",
                  }}
                >
                  <Icon size={18} />
                </div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{node.title}</div>
                <div className="mono" style={{ fontSize: 12, color: "var(--veil-muted)" }}>{node.sub}</div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
