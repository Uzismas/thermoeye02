import type { ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  title,
  note,
  actions,
}: {
  eyebrow: string;
  title: ReactNode;
  note: string;
  actions?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      <div className="section-side">
        <p className="section-note">{note}</p>
        {actions ? <div className="section-actions">{actions}</div> : null}
      </div>
    </div>
  );
}

export function PanelHeader({
  eyebrow,
  title,
  badge,
  badgeTone,
}: {
  eyebrow: string;
  title: string;
  badge: string;
  badgeTone?: "warning" | "secure";
}) {
  return (
    <div className="panel-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      <span className={`badge ${badgeTone ?? ""}`}>{badge}</span>
    </div>
  );
}

export function MetricCard({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{caption}</small>
    </article>
  );
}
