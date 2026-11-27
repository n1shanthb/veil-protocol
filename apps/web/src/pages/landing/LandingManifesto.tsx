import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const STATEMENT =
  "Zero knowledge shouldn't require building an entire cryptographic stack. Veil brings reusable proof verification, privacy primitives and developer tooling directly to Gno.land.";

function Word({ children, progress, range }: { children: string; progress: any; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.22, 1]);
  return (
    <motion.span style={{ opacity, display: "inline-block", marginRight: "0.28em" }}>
      {children}
    </motion.span>
  );
}

export function LandingManifesto() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 0.85", "end 0.45"],
  });

  const words = STATEMENT.split(" ");

  return (
    <section
      id="platform"
      ref={containerRef}
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "88px 24px",
      }}
    >
      <p
        style={{
          fontFamily: "var(--veil-font-display)",
          fontSize: "clamp(26px, 3.6vw, 44px)",
          lineHeight: 1.25,
          letterSpacing: "-0.02em",
          color: "var(--veil-text)",
          margin: 0,
        }}
      >
        {words.map((w, i) => {
          const start = i / words.length;
          const end = start + 1 / words.length;
          return (
            <Word key={`${w}-${i}`} progress={scrollYProgress} range={[start, end]}>
              {w}
            </Word>
          );
        })}
      </p>
    </section>
  );
}
