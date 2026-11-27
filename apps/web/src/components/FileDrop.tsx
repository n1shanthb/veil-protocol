import React, { useRef, useState } from "react";

interface FileDropProps {
  label: string;
  accept?: string;
  maxBytes?: number;
  onFileText: (text: string, file: File) => void;
  onError?: (msg: string) => void;
}

export function FileDrop({ label, accept = ".json,application/json", maxBytes = 1024 * 512, onFileText, onError }: FileDropProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileInfo, setFileInfo] = useState<string>("");

  const processFile = async (file: File) => {
    if (file.size > maxBytes) {
      onError?.(`File "${file.name}" exceeds ${Math.round(maxBytes / 1024)} KB limit.`);
      return;
    }
    const text = await file.text();
    setFileInfo(`${file.name} (${file.size.toLocaleString()} bytes)`);
    onFileText(text, file);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files?.[0];
        if (f) processFile(f);
      }}
      style={{
        border: `1px dashed ${dragging ? "var(--veil-brand)" : "var(--veil-lineStrong)"}`,
        background: dragging ? "var(--veil-selected)" : "var(--veil-bg)",
        borderRadius: 8,
        padding: "10px 12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        flexWrap: "wrap",
      }}
    >
      <div style={{ fontSize: 12.5, color: "var(--veil-muted)" }}>
        {fileInfo ? <span className="mono" style={{ color: "var(--veil-mint)" }}>{fileInfo}</span> : label}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) processFile(f);
        }}
      />
      <button
        type="button"
        className="veil-btn veil-btn-secondary"
        style={{ padding: "5px 12px", minHeight: 32, fontSize: 12 }}
        onClick={() => inputRef.current?.click()}
      >
        Choose File
      </button>
    </div>
  );
}
