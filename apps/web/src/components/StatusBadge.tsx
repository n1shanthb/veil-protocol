import React from "react";

export type BadgeTone = "neutral" | "mint" | "amber" | "rose" | "info";

interface StatusBadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
  title?: string;
}

export function StatusBadge({ tone = "neutral", children, title }: StatusBadgeProps) {
  const cls = tone === "neutral" ? "veil-badge" : `veil-badge veil-badge-${tone}`;
  return (
    <span className={cls} title={title}>
      {children}
    </span>
  );
}
