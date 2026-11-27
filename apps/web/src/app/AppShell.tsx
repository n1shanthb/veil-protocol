import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useStudio } from "./StudioContext";
import { StatusBadge } from "../components/StatusBadge";
import { Button } from "../components/Button";

const NAV_GROUPS = [
  {
    label: "Workspace",
    items: [
      { to: "/studio", label: "Overview", end: true },
      { to: "/studio/circuits", label: "Circuit Explorer" },
      { to: "/studio/forge", label: "Veil Forge" },
      { to: "/studio/playground", label: "Proof Playground" },
    ],
  },
  {
    label: "On-Chain",
    items: [
      { to: "/studio/registry", label: "Verifier Registry" },
      { to: "/studio/network", label: "Network & Releases" },
    ],
  },
  {
    label: "Applications",
    items: [
      { to: "/studio/showcase", label: "Showcase" },
      { to: "/studio/showcase/vote", label: "Veil Vote (Onyx)" },
      { to: "/studio/sandbox", label: "Local Sandbox" },
    ],
  },
  {
    label: "Resources",
    items: [
      { to: "/docs", label: "Documentation" },
      { to: "/docs/operators", label: "Operator Guide" },
    ],
  },
];

export function AppShell() {
  const { onyxStatus, onyxNetwork, onyxHeight, refreshAll } = useStudio();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="veil-studio-shell">
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 40,
          }}
        />
      )}

      <aside className={`veil-sidebar ${drawerOpen ? "open" : ""}`} aria-label="Studio Navigation">
        <NavLink to="/" className="veil-sidebar-brand">
          <img src="/assets/brand/veil-mark.svg" alt="Veil" width={26} height={26} />
          <div>
            <div style={{ fontFamily: "var(--veil-font-display)", fontWeight: 700, fontSize: 15, letterSpacing: "0.08em", color: "var(--veil-text)" }}>
              VEIL
            </div>
            <div style={{ fontSize: 11, color: "var(--veil-subtle)" }}>ZK Infrastructure</div>
          </div>
        </NavLink>

        <nav style={{ flex: 1 }}>
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="veil-nav-group-label">{group.label}</div>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `veil-nav-item ${isActive ? "active" : ""}`}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="veil-main-wrap">
        <header className="veil-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Button
              variant="secondary"
              type="button"
              className="veil-mobile-menu-btn"
              onClick={() => setDrawerOpen((o) => !o)}
              aria-label="Toggle navigation menu"
              style={{ padding: "6px 10px", minHeight: 36 }}
            >
              Menu
            </Button>
            <StatusBadge tone={onyxStatus === "ready" ? "mint" : onyxStatus === "unavailable" ? "rose" : "amber"}>
              {onyxStatus === "ready"
                ? `${onyxNetwork} @ #${onyxHeight}`
                : onyxStatus === "loading"
                  ? "Syncing Onyx..."
                  : "Onyx RPC Unavailable"}
            </StatusBadge>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Button
              variant="ghost"
              type="button"
              onClick={refreshAll}
              disabled={onyxStatus === "loading"}
              style={{ minHeight: 34, padding: "6px 12px", fontSize: 12.5 }}
            >
              {onyxStatus === "loading" ? "Syncing..." : "Sync Onyx"}
            </Button>
            <NavLink to="/docs" className="veil-btn veil-btn-secondary" style={{ minHeight: 34, padding: "6px 12px", fontSize: 12.5 }}>
              Docs
            </NavLink>
          </div>
        </header>

        <main className="veil-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
