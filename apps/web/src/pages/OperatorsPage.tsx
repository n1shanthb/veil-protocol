import React from "react";
import { Link } from "react-router-dom";
import { Panel } from "../components/Panel";
import { Notice } from "../components/Notice";

export function OperatorsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <div style={{ fontSize: 12.5, color: "var(--veil-subtle)", marginBottom: 6 }}>
          <Link to="/docs">Documentation</Link> / Operators
        </div>
        <h1 style={{ fontSize: 28, marginBottom: 6 }}>Deployment &amp; Operations Guide</h1>
        <p style={{ margin: 0, color: "var(--veil-muted)" }}>
          Security boundaries, relayer architecture, and Onyx governance constraints.
        </p>
      </div>

      <Notice tone="warn" title="Trusted Root Publisher">
        <code className="mono">veil_vote/v3</code> relies on an authorized <code className="mono">RootPublisher</code> address to add members and publish frozen Merkle roots. Poll #1 is a historical snapshot; new cohorts require an authorized operator transaction via <code className="mono">gnokey</code>.
      </Notice>

      <Panel title="Sponsored Relayer Boundaries">
        <ul style={{ margin: 0, paddingLeft: 20, color: "var(--veil-muted)", lineHeight: 1.7 }}>
          <li>Only <code className="mono">POST /api/relay/vote</code> is exposed for sponsored transactions.</li>
          <li>Requests are strictly validated against <code className="mono">onyx-1</code>, <code className="mono">veil_vote/v3</code>, and <code className="mono">Vote</code>.</li>
          <li>Daily gas budget is capped at 10,000,000 ugnot and persisted to disk.</li>
          <li>Rate limited to 15 requests per minute per IP.</li>
        </ul>
      </Panel>
    </div>
  );
}
