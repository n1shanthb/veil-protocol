import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, ShieldCheck, ArrowRight } from "lucide-react";
import { useStudio } from "../../app/StudioContext";

const FAN_CARDS = [
  { title: "Circuit Source", sub: "cubic_check.circom", x: -290, y: -36, rot: -9, delay: 0.15 },
  { title: "Verification Key", sub: "BN254 • IC[2]", x: -230, y: 82, rot: -5, delay: 0.22 },
  { title: "Public Signals", sub: '["91"]', x: -120, y: 145, rot: -2, delay: 0.28 },
  { title: "Groth16 Proof", sub: "pi_a, pi_b, pi_c", x: 120, y: 145, rot: 2, delay: 0.28 },
  { title: "Gno Verifier", sub: "groth16/v2 import", x: 230, y: 82, rot: 5, delay: 0.22 },
  { title: "Onyx Receipt", sub: "Height #1445406", x: 290, y: -36, rot: 9, delay: 0.15 },
];

export function LandingHero() {
  const { onyxStatus, onyxNetwork, onyxHeight } = useStudio();

  return (
    <section
      style={{
        position: "relative",
        padding: "136px 24px 88px",
        overflow: "hidden",
        textAlign: "center",
      }}
    >
      {/* Atmospheric emerald illumination */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -120,
          left: "50%",
          transform: "translateX(-50%)",
          width: 900,
          height: 520,
          background: "radial-gradient(ellipse at center, rgba(0, 232, 157, 0.14) 0%, rgba(5, 150, 105, 0.04) 45%, transparent 72%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: 1120, margin: "0 auto", position: "relative", zIndex: 2 }}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 24 }}
          className="veil-badge veil-badge-mint"
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: onyxStatus === "ready" ? "var(--veil-brand)" : "var(--veil-warn)",
            }}
          />
          {onyxStatus === "ready" && onyxHeight
            ? `${onyxNetwork} live @ #${onyxHeight.toLocaleString()}`
            : "Onyx Testnet (onyx-1)"}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05 }}
          style={{
            fontSize: "clamp(42px, 6.2vw, 76px)",
            lineHeight: 1.03,
            letterSpacing: "-0.03em",
            maxWidth: 820,
            margin: "0 auto 48px",
          }}
        >
          Prove everything.{" "}
          <span style={{ color: "var(--veil-brand)" }}>Reveal nothing.</span>
        </motion.h1>

        {/* Central product visualization + 6 fanned artifact cards */}
        <div
          style={{
            position: "relative",
            maxWidth: 680,
            margin: "0 auto 56px",
            padding: "24px 0",
          }}
        >
          {FAN_CARDS.map((card) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, scale: 0.9, x: 0, y: 20 }}
              animate={{ opacity: 0.92, scale: 1, x: card.x, y: card.y, rotate: card.rot }}
              transition={{ duration: 0.65, delay: card.delay, ease: [0.16, 1, 0.3, 1] }}
              className="veil-hero-fan-card"
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: 170,
                marginLeft: -85,
                marginTop: -38,
                background: "var(--veil-surface)",
                border: "1px solid var(--veil-lineStrong)",
                borderRadius: 12,
                padding: "12px 14px",
                textAlign: "left",
                boxShadow: "0 16px 40px rgba(0, 0, 0, 0.5)",
                pointerEvents: "none",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--veil-text)" }}>{card.title}</div>
              <div className="mono" style={{ fontSize: 11, color: "var(--veil-brand)", marginTop: 4 }}>{card.sub}</div>
            </motion.div>
          ))}

          {/* Central Proof Verification Workspace */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            style={{
              position: "relative",
              zIndex: 5,
              background: "linear-gradient(180deg, #131916 0%, #0C100E 100%)",
              border: "1px solid var(--veil-lineStrong)",
              borderRadius: 18,
              padding: 24,
              textAlign: "left",
              boxShadow: "0 28px 80px rgba(0, 0, 0, 0.72), 0 0 60px rgba(0, 232, 157, 0.08)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ShieldCheck size={18} color="var(--veil-brand)" />
                <span style={{ fontWeight: 600, fontSize: 14 }}>Veil Proof Workspace</span>
              </div>
              <span className="veil-badge veil-badge-mint">
                <CheckCircle2 size={12} /> Groth16 • BN254
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div style={{ background: "var(--veil-bg)", border: "1px solid var(--veil-line)", borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, color: "var(--veil-subtle)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Verifier Realm
                </div>
                <div className="mono" style={{ fontSize: 12.5, color: "var(--veil-text)", marginTop: 4 }}>
                  cubic_check_verifier
                </div>
              </div>
              <div style={{ background: "var(--veil-bg)", border: "1px solid var(--veil-line)", borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, color: "var(--veil-subtle)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Core Engine
                </div>
                <div className="mono" style={{ fontSize: 12.5, color: "var(--veil-brand)", marginTop: 4 }}>
                  groth16/v2 (onyx-1)
                </div>
              </div>
            </div>

            <div style={{ background: "var(--veil-bg)", border: "1px solid var(--veil-line)", borderRadius: 10, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--veil-muted)" }}>
                <span>EIP-197 Encoding &amp; Pairing Check</span>
                <span className="mono" style={{ color: "var(--veil-mint)" }}>VALID</span>
              </div>
            </div>
          </motion.div>
        </div>

        <p style={{ fontSize: 17, color: "var(--veil-muted)", maxWidth: 580, margin: "0 auto 28px", lineHeight: 1.65 }}>
          Compile Circom Groth16 circuits, generate Gno verifier realms, verify proofs in-browser, and inspect live Onyx deployments.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
          <Link to="/studio" className="veil-btn veil-btn-primary" style={{ padding: "12px 24px", fontSize: 15, borderRadius: 999 }}>
            Launch Studio <ArrowRight size={16} />
          </Link>
          <a href="#how-it-works" className="veil-btn veil-btn-secondary" style={{ padding: "12px 24px", fontSize: 15, borderRadius: 999 }}>
            How it works
          </a>
        </div>
      </div>
    </section>
  );
}
