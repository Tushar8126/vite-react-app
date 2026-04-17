import { AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import type { StatusInfo } from "@/lib/glucose";

const tones = {
  warning: {
    border: "border-warning/40",
    bg: "bg-warning/10",
    text: "text-warning",
    Icon: AlertTriangle,
  },
  success: {
    border: "border-success/40",
    bg: "bg-success/10",
    text: "text-success",
    Icon: CheckCircle2,
  },
  destructive: {
    border: "border-destructive/40",
    bg: "bg-destructive/10",
    text: "text-destructive",
    Icon: TrendingUp,
  },
} as const;

export function StatusCard({ info, value }: { info: StatusInfo; value: number }) {
  const t = tones[info.tone];
  const Icon = t.Icon;
  return (
    <div className={`rounded-2xl border ${t.border} ${t.bg} p-6 animate-fade-in-up`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className={`inline-flex items-center gap-2 ${t.text} text-sm font-medium`}>
            <Icon className="w-4 h-4" /> {info.label} — {info.title}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-5xl font-bold ${t.text}`}>{value}</span>
            <span className="text-muted-foreground">mg/dL</span>
          </div>
        </div>
      </div>
      <ul className="mt-5 space-y-2">
        {info.suggestions.map((s) => (
          <li key={s} className="flex items-start gap-2 text-sm text-foreground/90">
            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full ${t.bg.replace("/10", "")} ${t.text.replace("text-", "bg-")}`} />
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}
