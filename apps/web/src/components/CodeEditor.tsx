import React, { useState } from "react";
import { Button } from "./Button";

interface CodeEditorProps {
  code: string;
  label?: string;
  filename?: string;
  maxHeight?: number;
}

export function CodeEditor({ code, label, filename, maxHeight = 420 }: CodeEditorProps) {
  const [copied, setCopied] = useState(false);
  const [wrap, setWrap] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  };

  const handleDownload = () => {
    if (!filename) return;
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ border: "1px solid var(--veil-line)", borderRadius: 10, overflow: "hidden", background: "var(--veil-bg)" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 12px",
          background: "var(--veil-raised)",
          borderBottom: "1px solid var(--veil-line)",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <span className="mono" style={{ fontSize: 12, color: "var(--veil-muted)" }}>
          {label || filename || "output"}
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          <Button variant="ghost" type="button" onClick={() => setWrap((w) => !w)} style={{ padding: "4px 10px", minHeight: 30, fontSize: 12 }}>
            {wrap ? "No Wrap" : "Wrap"}
          </Button>
          <Button variant="ghost" type="button" onClick={handleCopy} style={{ padding: "4px 10px", minHeight: 30, fontSize: 12 }}>
            {copied ? "Copied" : "Copy"}
          </Button>
          {filename && (
            <Button variant="ghost" type="button" onClick={handleDownload} style={{ padding: "4px 10px", minHeight: 30, fontSize: 12 }}>
              Download
            </Button>
          )}
        </div>
      </div>
      <pre
        style={{
          margin: 0,
          padding: 14,
          maxHeight,
          overflow: "auto",
          fontSize: 12.5,
          lineHeight: 1.55,
          color: "var(--veil-text)",
          whiteSpace: wrap ? "pre-wrap" : "pre",
          wordBreak: wrap ? "break-word" : "normal",
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}
