import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "Which proof systems and curves are supported?",
    a: "Veil Core (groth16/v2) supports Groth16 over BN254 (bn128) with up to 64 public inputs. PLONK and FFLONK are rejected.",
  },
  {
    q: "Do my identity secrets or witnesses leave the browser?",
    a: "No. Identity derivation, witness generation, and snarkjs Groth16 proving run entirely in browser memory. Only public commitments, roots, nullifiers, and proofs are transmitted.",
  },
  {
    q: "How do I deploy a custom verifier to Onyx?",
    a: "Use Veil Forge to convert your verification_key.json into a Gno realm, download the ZIP bundle, test locally with the Veil CLI, and deploy with gnokey maketx addpkg.",
  },
  {
    q: "Why can't new visitors vote in Onyx Poll #1?",
    a: "Poll #1 uses a frozen 3-member snapshot on veil_vote/v3 and all 3 nullifiers have been spent. Use the Local Sandbox to test identity creation, enrollment, and proving.",
  },
];

export function LandingFaq() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 24px 88px" }}>
      <div className="veil-split-layout" style={{ gap: 40 }}>
        <div>
          <span className="veil-badge veil-badge-mint" style={{ marginBottom: 12 }}>FAQ</span>
          <h2 style={{ fontSize: "clamp(28px, 3.4vw, 40px)" }}>Common Questions</h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {FAQS.map((item, idx) => {
            const open = openIdx === idx;
            return (
              <div
                key={item.q}
                style={{
                  background: "var(--veil-surface)",
                  border: "1px solid var(--veil-line)",
                  borderRadius: 14,
                  overflow: "hidden",
                }}
              >
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenIdx(open ? null : idx)}
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    padding: "16px 20px",
                    background: "transparent",
                    border: "none",
                    color: "var(--veil-text)",
                    fontSize: 15,
                    fontWeight: 600,
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    size={18}
                    style={{
                      transform: open ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 160ms ease",
                      flexShrink: 0,
                    }}
                  />
                </button>
                {open && (
                  <div style={{ padding: "0 20px 18px", color: "var(--veil-muted)", fontSize: 14, lineHeight: 1.65 }}>
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
