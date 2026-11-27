import React from "react";
import { Link } from "react-router-dom";
import { Panel } from "../components/Panel";
import { Notice } from "../components/Notice";
import { CodeEditor } from "../components/CodeEditor";

export function IntegrationsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <div style={{ fontSize: 12.5, color: "var(--veil-subtle)", marginBottom: 6 }}>
          <Link to="/docs">Documentation</Link> / Integrations
        </div>
        <h1 style={{ fontSize: 28, marginBottom: 6 }}>CLI, SDK &amp; Agent Integrations</h1>
        <p style={{ margin: 0, color: "var(--veil-muted)" }}>
          Installable packages, Agent Skills, and stdio MCP server for using Veil outside Veil Studio.
        </p>
      </div>

      <Notice tone="warn" title="Package Publication Status">
        <code className="mono">@veil-gno/sdk</code>, <code className="mono">@veil-gno/cli</code>, and <code className="mono">@veil-gno/mcp</code> (v0.1.0) are packaged and tested via local <code className="mono">npm pack</code> tarballs. Public npm publication is pending owner approval.
      </Notice>

      <Panel title="1. Veil CLI (@veil-gno/cli)">
        <CodeEditor
          label="CLI Commands"
          code={`# Environment diagnostics\nveil doctor --json\n\n# Inspect & generate Gno verifier\nveil inspect verification_key.json --json\nveil generate verification_key.json --out ./my_verifier --pkgpath gno.land/r/<namespace>/my_verifier\n\n# Query live Onyx & Registry\nveil network --json\nveil registry --json\n\n# Prepare deployment plan (dry-run)\nveil deploy ./my_verifier --pkgpath gno.land/r/<namespace>/my_verifier --dry-run --json`}
        />
      </Panel>

      <Panel title="2. Agent Skill (use-veil) &amp; MCP Server (@veil-gno/mcp)">
        <CodeEditor
          label="Install Skill & Configure MCP"
          code={`# Install the use-veil Agent Skill\nveil skills install\n\n# Print MCP configuration for Claude Code, Cursor, Codex, Gemini CLI, or Antigravity\nveil setup agent --client antigravity`}
        />
        <div style={{ marginTop: 14 }}>
          <CodeEditor
            label="mcpServers config"
            code={`{\n  "mcpServers": {\n    "veil": {\n      "command": "npx",\n      "args": ["-y", "@veil-gno/mcp"]\n    }\n  }\n}`}
          />
        </div>
      </Panel>

      <Panel title="3. Example Coding Agent Prompts">
        <ul style={{ margin: 0, paddingLeft: 20, color: "var(--veil-muted)", lineHeight: 1.75 }}>
          <li>"Use Veil to inspect `verification_key.json` and generate a Gno verifier realm for `onyx-1`."</li>
          <li>"Check live Onyx network status and list registered verifiers in `veil_registry/v1`."</li>
          <li>"Prepare a dry-run `gnokey` deployment plan for `./my_verifier`."</li>
        </ul>
      </Panel>
    </div>
  );
}
