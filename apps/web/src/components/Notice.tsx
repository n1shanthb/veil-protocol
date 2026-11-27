import React from "react";

interface NoticeProps {
  tone?: "info" | "warn" | "error" | "mint";
  title?: string;
  children: React.ReactNode;
}

const TONE_STYLES: Record<string, { border: string; bg: string; color: string }> = {
  info: { border: "rgba(155, 198, 247, 0.35)", bg: "rgba(155, 198, 247, 0.08)", color: "var(--veil-info)" },
  warn: { border: "rgba(245, 199, 109, 0.35)", bg: "rgba(245, 199, 109, 0.08)", color: "var(--veil-warn)" },
  error: { border: "rgba(253, 164, 175, 0.35)", bg: "rgba(253, 164, 175, 0.08)", color: "var(--veil-error)" },
  mint: { border: "rgba(52, 211, 153, 0.35)", bg: "rgba(52, 211, 153, 0.08)", color: "var(--veil-mint)" },
};

export function Notice({ tone = "info", title, children }: NoticeProps) {
  const s = TONE_STYLES[tone];
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        border: `1px solid ${s.border}`,
        background: s.bg,
        borderRadius: 10,
        padding: "12px 14px",
        fontSize: 13,
      }}
    >
      {title && <div style={{ fontWeight: 600, color: s.color, marginBottom: 4 }}>{title}</div>}
      <div style={{ color: "var(--veil-text)" }}>{children}</div>
    </div>
  );
}
