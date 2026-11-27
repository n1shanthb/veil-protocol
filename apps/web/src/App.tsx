import React, { Suspense, lazy } from "react";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { StudioProvider } from "./app/StudioContext";
import { AppShell } from "./app/AppShell";
import { LandingPage } from "./pages/LandingPage";

const OverviewPage = lazy(() => import("./pages/OverviewPage").then((m) => ({ default: m.OverviewPage })));
const CircuitsPage = lazy(() => import("./pages/CircuitsPage").then((m) => ({ default: m.CircuitsPage })));
const CircuitDetailPage = lazy(() => import("./pages/CircuitDetailPage").then((m) => ({ default: m.CircuitDetailPage })));
const ForgePage = lazy(() => import("./pages/ForgePage").then((m) => ({ default: m.ForgePage })));
const PlaygroundPage = lazy(() => import("./pages/PlaygroundPage").then((m) => ({ default: m.PlaygroundPage })));
const RegistryPage = lazy(() => import("./pages/RegistryPage").then((m) => ({ default: m.RegistryPage })));
const VerifierDetailPage = lazy(() => import("./pages/VerifierDetailPage").then((m) => ({ default: m.VerifierDetailPage })));
const NetworkPage = lazy(() => import("./pages/NetworkPage").then((m) => ({ default: m.NetworkPage })));
const ShowcasePage = lazy(() => import("./pages/ShowcasePage").then((m) => ({ default: m.ShowcasePage })));
const VotePage = lazy(() => import("./pages/VotePage").then((m) => ({ default: m.VotePage })));
const SandboxPage = lazy(() => import("./pages/SandboxPage").then((m) => ({ default: m.SandboxPage })));
const DocsPage = lazy(() => import("./pages/DocsPage").then((m) => ({ default: m.DocsPage })));
const OperatorsPage = lazy(() => import("./pages/OperatorsPage").then((m) => ({ default: m.OperatorsPage })));

function NotFoundPage() {
  return (
    <div className="veil-panel" style={{ maxWidth: 520, margin: "48px auto", textAlign: "center" }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Route Not Found</h1>
      <p style={{ color: "var(--veil-muted)", marginBottom: 20 }}>
        The requested Veil Studio route does not exist.
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <Link to="/" className="veil-btn veil-btn-secondary">Home</Link>
        <Link to="/studio" className="veil-btn veil-btn-primary">Open Studio</Link>
      </div>
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <StudioProvider>
          <Suspense fallback={<div style={{ padding: 32, color: "var(--veil-muted)" }}>Loading...</div>}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/studio" element={<AppShell />}>
                <Route index element={<OverviewPage />} />
                <Route path="circuits" element={<CircuitsPage />} />
                <Route path="circuits/:id" element={<CircuitDetailPage />} />
                <Route path="forge" element={<ForgePage />} />
                <Route path="playground" element={<PlaygroundPage />} />
                <Route path="registry" element={<RegistryPage />} />
                <Route path="registry/:id" element={<VerifierDetailPage />} />
                <Route path="network" element={<NetworkPage />} />
                <Route path="showcase" element={<ShowcasePage />} />
                <Route path="showcase/vote" element={<VotePage />} />
                <Route path="sandbox" element={<SandboxPage />} />
              </Route>
              <Route path="/docs" element={<AppShell />}>
                <Route index element={<DocsPage />} />
                <Route path="operators" element={<OperatorsPage />} />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </StudioProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
