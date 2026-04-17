import { useEffect, useState } from "react";
import { Brain, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Insights {
  summary: string;
  risk: "low" | "medium" | "high";
  insights: string[];
}

export function InsightsPanel({ readings }: { readings: any[] }) {
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchInsights() {
    if (readings.length === 0) {
      setData({ insights: [], risk: "low", summary: "Log a few readings to unlock personalized insights." });
      return;
    }
    setLoading(true);
    try {
      const { data: out, error } = await supabase.functions.invoke("ai-insights", {
        body: { readings },
      });
      if (error) throw error;
      if ((out as any)?.error) throw new Error((out as any).error);
      setData(out as Insights);
    } catch (e: any) {
      toast.error(e.message || "Couldn't fetch insights");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchInsights(); /* eslint-disable-next-line */ }, [readings.length]);

  const riskMeta = {
    low: { color: "text-success", bg: "bg-success/10", border: "border-success/30", label: "Low risk" },
    medium: { color: "text-warning", bg: "bg-warning/10", border: "border-warning/30", label: "Medium risk" },
    high: { color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30", label: "High risk" },
  };
  const r = data ? riskMeta[data.risk] : riskMeta.low;

  return (
    <div className="glass-card rounded-2xl p-6 border border-border">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">AI insights</h2>
        <Button size="icon" variant="ghost" onClick={fetchInsights} disabled={loading} className="ml-auto" aria-label="Refresh">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </Button>
      </div>

      {!data && loading && (
        <div className="text-sm text-muted-foreground">Analyzing your readings…</div>
      )}

      {data && (
        <div className="space-y-4">
          <div className={`flex items-center gap-3 p-3 rounded-xl border ${r.border} ${r.bg}`}>
            <ShieldAlert className={`w-5 h-5 ${r.color}`} />
            <div>
              <div className={`text-sm font-semibold ${r.color}`}>{r.label}</div>
              <div className="text-xs text-muted-foreground">{data.summary}</div>
            </div>
          </div>
          {data.insights.length > 0 && (
            <ul className="space-y-2">
              {data.insights.map((i, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-foreground/90 p-2 rounded-lg hover:bg-secondary/40 transition-colors">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  {i}
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-muted-foreground italic">
            AI-generated suggestions, not a medical diagnosis. Always consult your doctor.
          </p>
        </div>
      )}
    </div>
  );
}
