import React, { useState } from "react";
import { useStudio } from "../app/StudioContext";
import {
  ONYX_RPC,
  encodePublicInputs,
  snarkjs,
  validateAndConvertProof,
  validateAndConvertVK,
} from "../veil-browser";
import { Panel } from "../components/Panel";
import { Button } from "../components/Button";
import { FileDrop } from "../components/FileDrop";
import { Notice } from "../components/Notice";
import { StatusBadge } from "../components/StatusBadge";
import { CodeEditor } from "../components/CodeEditor";

export function PlaygroundPage() {
  const { playgroundDraft, setPlaygroundDraft } = useStudio();
  const [vkJson, setVkJson] = useState(playgroundDraft.vk);
  const [proofJson, setProofJson] = useState(playgroundDraft.proof);
  const [publicJson, setPublicJson] = useState(playgroundDraft.pub);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<{ valid: boolean; output: string } | null>(null);
  const [error, setError] = useState("");

  const invalidate = () => {
    setResult(null);
    setError("");
  };

  const handleVerify = async () => {
    setError("");
    setResult(null);
    setVerifying(true);
    try {
      const vkObj = JSON.parse(vkJson);
      const proofObj = JSON.parse(proofJson);
      const pubObj = JSON.parse(publicJson);

      validateAndConvertVK(vkObj);
      const p = validateAndConvertProof(proofObj);
      const pub = encodePublicInputs(pubObj);

      const ok = await snarkjs.groth16.verify(vkObj, pubObj, proofObj);
      const out = [
        `[1] BROWSER SNARKJS: ${ok ? "VALID" : "INVALID"}`,
        `[2] GNO EIP-197 ENCODING:`,
        `A (G1 64B): ${p.a}`,
        `B (G2 128B EIP-197): ${p.b}`,
        `C (G1 64B): ${p.c}`,
        `Public Inputs (${pub.length}): ${pub.join(",")}`,
        ``,
        `[3] GNOVM VERIFICATION (CLI):`,
        `node cli/veil.js test --dir <verifier-dir> --proof proof.json --public public.json`,
        ``,
        `[4] ONYX ON-CHAIN CALL:`,
        `gnokey maketx call -pkgpath "<realm>" -func Verify -args ${p.a} -args ${p.b} -args ${p.c} -args ${pub.join(",")} -chainid onyx-1 -remote ${ONYX_RPC} <key>`,
      ].join("\n");

      setResult({ valid: Boolean(ok), output: out });
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <h1 style={{ fontSize: 28, marginBottom: 6 }}>Proof Playground</h1>
        <p style={{ margin: 0, color: "var(--veil-muted)" }}>
          Run real browser-side <code className="mono">snarkjs.groth16.verify</code>, inspect EIP-197 Gno encodings, and generate CLI verification commands.
        </p>
      </div>

      <Panel title="1. Import Artifacts (Browser-Local)">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="veil-label" htmlFor="pg-vk">verification_key.json</label>
            <FileDrop
              label="Drop verification_key.json or choose file"
              onFileText={(t) => {
                setVkJson(t);
                setPlaygroundDraft({ vk: t, proof: proofJson, pub: publicJson });
                invalidate();
              }}
              onError={setError}
            />
            <textarea
              id="pg-vk"
              className="veil-textarea"
              style={{ marginTop: 8 }}
              placeholder='{"protocol":"groth16","curve":"bn128",...}'
              value={vkJson}
              onChange={(e) => {
                setVkJson(e.target.value);
                invalidate();
              }}
            />
          </div>

          <div className="veil-grid-2">
            <div>
              <label className="veil-label" htmlFor="pg-proof">proof.json</label>
              <FileDrop
                label="Drop proof.json or choose file"
                onFileText={(t) => {
                  setProofJson(t);
                  invalidate();
                }}
                onError={setError}
              />
              <textarea
                id="pg-proof"
                className="veil-textarea"
                style={{ marginTop: 8 }}
                placeholder='{"pi_a":[...],"pi_b":[...],"pi_c":[...]}'
                value={proofJson}
                onChange={(e) => {
                  setProofJson(e.target.value);
                  invalidate();
                }}
              />
            </div>

            <div>
              <label className="veil-label" htmlFor="pg-public">public.json</label>
              <FileDrop
                label="Drop public.json or choose file"
                onFileText={(t) => {
                  setPublicJson(t);
                  invalidate();
                }}
                onError={setError}
              />
              <textarea
                id="pg-public"
                className="veil-textarea"
                style={{ marginTop: 8 }}
                placeholder='["91"]'
                value={publicJson}
                onChange={(e) => {
                  setPublicJson(e.target.value);
                  invalidate();
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <Button variant="primary" type="button" onClick={handleVerify} disabled={verifying}>
              {verifying ? "Verifying..." : "Verify in Browser (snarkjs) & Encode for Gno"}
            </Button>
            {result && (
              <StatusBadge tone={result.valid ? "mint" : "rose"}>
                {result.valid ? "BROWSER SNARKJS: VALID" : "BROWSER SNARKJS: INVALID"}
              </StatusBadge>
            )}
          </div>

          {error && <Notice tone="error" title="Validation Error">{error}</Notice>}
        </div>
      </Panel>

      {result && (
        <Panel title="Verification &amp; Gno Serialization Output">
          <CodeEditor code={result.output} filename="gno-encoding.txt" />
        </Panel>
      )}
    </div>
  );
}
