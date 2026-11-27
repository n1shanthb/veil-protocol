import React from "react";

interface PanelProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  raised?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Panel({ title, subtitle, action, raised = false, children, className = "" }: PanelProps) {
  return (
    <section className={`${raised ? "veil-panel-raised" : "veil-panel"} ${className}`.trim()}>
      {(title || action) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
          <div>
            {title && <h2 style={{ fontSize: 17, fontWeight: 600 }}>{title}</h2>}
            {subtitle && <p style={{ margin: "4px 0 0", color: "var(--veil-muted)", fontSize: 13 }}>{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
