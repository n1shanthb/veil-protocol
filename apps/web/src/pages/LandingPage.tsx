import React from "react";
import { LandingHeader } from "./landing/LandingHeader";
import { LandingHero } from "./landing/LandingHero";
import { LandingManifesto } from "./landing/LandingManifesto";
import { LandingInfraDiagram } from "./landing/LandingInfraDiagram";
import { LandingLiveNumbers } from "./landing/LandingLiveNumbers";
import { LandingHowItWorks } from "./landing/LandingHowItWorks";
import { LandingTrust } from "./landing/LandingTrust";
import { LandingBuiltOn } from "./landing/LandingBuiltOn";
import { LandingFaq } from "./landing/LandingFaq";
import { LandingFooter } from "./landing/LandingFooter";

export function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--veil-bg)", color: "var(--veil-text)" }}>
      <LandingHeader />
      <main>
        <LandingHero />
        <LandingManifesto />
        <LandingInfraDiagram />
        <LandingLiveNumbers />
        <LandingHowItWorks />
        <LandingTrust />
        <LandingBuiltOn />
        <LandingFaq />
      </main>
      <LandingFooter />
    </div>
  );
}
