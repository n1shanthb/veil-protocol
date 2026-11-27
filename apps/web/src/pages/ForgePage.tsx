import React, { useState } from "react";
import JSZip from "jszip";
import { useStudio } from "../app/StudioContext";
import { CORE_PKG_PATH, ONYX_RPC, generateGnoVerifierSource, validateAndConvertVK } from "../veil-browser";
import { Panel } from "../components/Panel";
import { Button } from "../components/Button";
import { FileDrop } from "../components/FileDrop";
import { Notice } from "../components/Notice";
import { CodeEditor } from "../components/CodeEditor";

export function ForgePage() {
  const { forgeDraftVk, setForgeDraftVk } = useStudio();
  const [pkgPath, setPkgPath] = useState("gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/custom_verifier");
  const [vkJson, setVkJson] = useState(forgeDraftVk);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [nPublic, setNPublic] = useState<number | null>(null);

  const handlePkgChange = (val: string) => {
    setPkgPath(val);
    setOutput("");
    setError("");
  };

  const handleVkChange = (val: string) => {
    setVkJson(val);
    setForgeDraftVk(val);
    setOutput("");
    setError("");
  };

  const handleGenerate = () => {
    setError("");
    setOutput("");
    setNPublic(null);
    try {
      const trimmedPkg = pkgPath.trim();
      if (!/^gno\.land\/[pr]\/[a-zA-Z0-9_/-]+$/.test(trimmedPkg)) {
        throw new Error("Invalid Gno package path. Expected format: gno.land/r/<namespace>/<name>");
      }
      if (vkJson.length > 512 * 1024) {
        throw new Error("verification_key.json exceeds 512 KB limit.");
      }
      const vk = JSON.parse(vkJson);
      const conv = validateAndConvertVK(vk);
      const src = generateGnoVerifierSource(trimmedPkg, conv);
      setNPublic(conv.nPublic);
      setOutput(src);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  };

  const handleExportZip = async () => {
    if (!output) return;
    const zip = new JSZip();
    zip.file("gnomod.toml", `module = "${pkgPath.trim()}"\ngno = "0.9"\n`);
    zip.file("verifier.gno", output);
    zip.file(
      "README.md",
      `# Veil Generated Verifier\n\nPackage: \`${pkgPath.trim()}\`\nCore: \`${CORE_PKG_PATH}\`\nPublic Inputs: ${nPublic ?? "unknown"}\n\n## Test locally\n\`\`\`bash\nnode cli/veil.js test --dir <this-dir> --proof proof.json --public public.json\n\`\`\`\n\n## Deploy to Onyx\n\`\`\`bash\ngnokey maketx addpkg -pkgpath "${pkgPath.trim()}" -pkgdir . -gas-fee 1000000ugnot -gas-wanted 10000000 -chainid onyx-1 -remote ${ONYX_RPC} <key>\n\`\`\`\n`
    );
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "veil-verifier-bundle.zip";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <h1 style={{ fontSize: 28, marginBottom: 6 }}>Veil Forge</h1>
        <p style={{ margin: 0, color: "var(--veil-muted)" }}>
          Convert any snarkjs Groth16/BN254 <code className="mono">verification_key.json</code> into a Gno verifier realm importing <code className="mono">groth16/v2</code>.
        </p>
      </div>

      <div className="veil-split-layout">
        <Panel title="1. Input Verification Key">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label className="veil-label" htmlFor="forge-pkg">Target Gno Package Path</label>
              <input
                id="forge-pkg"
                className="veil-input"
                value={pkgPath}
                onChange={(e) => handlePkgChange(e.target.value)}
              />
            </div>

            <div>
              <label className="veil-label">Upload verification_key.json</label>
              <FileDrop
                label="Drop verification_key.json here or choose file"
                onFileText={(text) => handleVkChange(text)}
                onError={(msg) => setError(msg)}
              />
            </div>

            <div>
              <label className="veil-label" htmlFor="forge-vk">Or paste verification_key.json</label>
              <textarea
                id="forge-vk"
                className="veil-textarea"
                placeholder='{"protocol":"groth16","curve":"bn128",...}'
                value={vkJson}
                onChange={(e) => handleVkChange(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Button variant="primary" type="button" onClick={handleGenerate}>
                Validate &amp; Generate Gno Verifier
              </Button>
              {output && (
                <Button variant="secondary" type="button" onClick={handleExportZip}>
                  Download Deployable ZIP
                </Button>
              )}
            </div>

            {error && <Notice tone="error" title="Validation Error">{error}</Notice>}
          </div>
        </Panel>

        <Panel title="2. Deployment Guidance" raised>
          <p style={{ marginTop: 0, color: "var(--veil-muted)", fontSize: 13.5 }}>
            Browser-side wallet deployment is not enabled. After generating and downloading the ZIP bundle, deploy using <code className="mono">gnokey</code> CLI:
          </p>
          <CodeEditor
            label="CLI Deployment"
            code={`gnokey maketx addpkg \\\n  -pkgpath "${pkgPath.trim()}" \\\n  -pkgdir ./veil-verifier \\\n  -gas-fee 1000000ugnot \\\n  -gas-wanted 10000000 \\\n  -chainid onyx-1 \\\n  -remote ${ONYX_RPC} <key>`}
          />
        </Panel>
      </div>

      {output && (
        <Panel title="Generated verifier.gno" subtitle={`Validated BN254 Groth16 • ${nPublic} public input(s)`}>
          <CodeEditor code={output} filename="verifier.gno" />
        </Panel>
      )}
    </div>
  );
}
