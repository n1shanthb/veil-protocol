import React from "react";
import { Link } from "react-router-dom";
import { CORE_PKG_PATH } from "../veil-browser";
import { Panel } from "../components/Panel";
import { CodeEditor } from "../components/CodeEditor";

export function DocsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <h1 style={{ fontSize: 28, marginBottom: 6 }}>Developer Documentation</h1>
        <p style={{ margin: 0, color: "var(--veil-muted)" }}>
          Quickstart, Gno <code className="mono">semaphore/v2</code> primitives, and pinned toolchain commands.
        </p>
      </div>

      <Panel title="5-Minute Circuit-to-Verifier Quickstart">
        <CodeEditor
          label="CLI Quickstart"
          code={`# 1. Inspect any snarkjs Groth16/BN254 verification key\nnode cli/veil.js inspect circuits/external/verification_key.json\n\n# 2. Generate a deployable Gno verifier realm importing Veil Core (groth16/v2)\nnode cli/veil.js generate circuits/build/cubic_check/verification_key.json \\\n  --out examples/cubic_check_verifier \\\n  --pkgpath gno.land/r/<your-namespace>/cubic_check_verifier\n\n# 3. Verify a real snarkjs proof inside GnoVM\nnode cli/veil.js test \\\n  --dir examples/cubic_check_verifier \\\n  --proof circuits/build/cubic_check/proof.json \\\n  --public circuits/build/cubic_check/public.json`}
        />
      </Panel>

      <Panel title="Veil Primitives (semaphore/v2)">
        <p style={{ marginTop: 0, color: "var(--veil-muted)", fontSize: 13.5 }}>
          Reusable Gno building blocks for Semaphore v4 membership, domain-separated scopes, and atomic nullifier tracking.
        </p>
        <CodeEditor
          label="Gno Import & Usage"
          code={`import (\n  "${CORE_PKG_PATH}"\n  "gno.land/p/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/semaphore/v2"\n)\n\n// Canonical Semaphore v4 hash: uint256(keccak256(toBeHex(val, 32))) >> 8\nmsgHash, _ := semaphore.HashToField(semaphore.Uint64ToBE32(1))\n\n// Domain-separated scope across network, app, group, and poll\nscope := semaphore.DomainScopeFull("onyx-1", "my_app/v1", groupID, pollID)\n\n// Atomic verification + nullifier consumption\nerr := semaphore.VerifyAndConsume(vks, groups, nullifiers, groupID, 10, root, nullifier, rawMsg, rawScope, proof)`}
        />
      </Panel>

      <Panel title="Operations &amp; Relayer Guide">
        <p style={{ marginTop: 0, color: "var(--veil-muted)", fontSize: 13.5 }}>
          Learn how the sponsored relayer, GPAS activation, and Onyx deployment workflow operate.
        </p>
        <Link to="/docs/operators" className="veil-btn veil-btn-secondary">
          Open Operator Guide →
        </Link>
      </Panel>
    </div>
  );
}
