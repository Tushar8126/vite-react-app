import { useEffect, useMemo, useState } from "react";
import { Activity, AlertCircle, Bell, Download, History, LineChart as LineIcon, Loader2, Pill, TrendingUp, Trash2 } from "lucide-react";
import { format, subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { GlucoseChart } from "@/components/GlucoseChart";
import { Chatbot } from "@/components/Chatbot";
import { ReadingForm } from "@/components/ReadingForm";
import { RemindersPanel } from "@/components/RemindersPanel";
import { InsightsPanel } from "@/components/InsightsPanel";
import { FAQ } from "@/components/FAQ";
import { EmergencyButton } from "@/components/EmergencyButton";
import { classify, MEAL_CONTEXTS } from "@/lib/glucose";
import { exportReadingsPdf } from "@/lib/pdfExport";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Reading {
  id: string;
  value: number;
  status: string;
  meal_context: string | null;
  measured_at: string;
  created_at: string;
}

const mealLabel = (v: string | null) =>
  MEAL_CONTEXTS.find((m) => m.value === v)?.label ?? "—";

export default function Dashboard() {
  const { user, username } = useAuth();
  const [readings, setReadings] = useState<Reading[]>([]);
  const [activeReminders, setActiveReminders] = useState(0);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    const [{ data: rs }, { data: rems }, { data: als }] = await Promise.all([
      supabase.from("readings").select("id, value, status, meal_context, measured_at, created_at").order("measured_at", { ascending: false }).limit(100),
      supabase.from("reminders").select("id").eq("enabled", true),
      supabase.from("alerts").select("id").eq("read", false),
    ]);
    setReadings((rs ?? []) as Reading[]);
    setActiveReminders((rems ?? []).length);
    setUnreadAlerts((als ?? []).length);
    setLoading(false);
  }

  useEffect(() => { if (user) loadAll(); }, [user]);

  async function remove(id: string) {
    const { error } = await supabase.from("readings").delete().eq("id", id);
    if (error) return toast.error("Failed to delete");
    setReadings((r) => r.filter((x) => x.id !== id));
    toast.success("Deleted");
  }

  const last = readings[0];
  const lastInfo = last ? classify(last.value) : null;

  const last7 = useMemo(() => {
    const cutoff = subDays(new Date(), 7);
    return readings.filter((r) => new Date(r.measured_at) >= cutoff);
  }, [readings]);

  const avg7 = last7.length ? Math.round(last7.reduce((a, b) => a + b.value, 0) / last7.length) : null;

  const chartData = useMemo(() => {
    return [...last7].reverse().map((r) => ({
      time: format(new Date(r.measured_at), "MMM d HH:mm"),
      value: r.value,
    }));
  }, [last7]);

  const downloadPdf = () => {
    if (readings.length === 0) return toast.error("No readings to export yet.");
    exportReadingsPdf({ username, readings });
    toast.success("PDF report downloaded");
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6 pb-32">
        {/* Summary cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <SummaryCard
            icon={Activity}
            label="Latest glucose"
            value={last ? `${last.value}` : "—"}
            sub={last ? `${lastInfo?.label} · ${mealLabel(last.meal_context)}` : "Log to start"}
            tone={lastInfo?.tone === "destructive" ? "destructive" : lastInfo?.tone === "warning" ? "warning" : "primary"}
          />
          <SummaryCard
            icon={TrendingUp}
            label="7-day average"
            value={avg7 !== null ? `${avg7}` : "—"}
            sub={`${last7.length} readings`}
            tone="accent"
          />
          <SummaryCard
            icon={Pill}
            label="Active reminders"
            value={`${activeReminders}`}
            sub="Medication & checks"
            tone="primary"
          />
          <SummaryCard
            icon={Bell}
            label="Unread alerts"
            value={`${unreadAlerts}`}
            sub="See bell icon"
            tone={unreadAlerts > 0 ? "destructive" : "muted"}
          />
        </section>

        {loading && (
          <div className="flex items-center justify-center text-muted-foreground text-sm py-2">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading your data…
          </div>
        )}

        {/* Reading form + status */}
        <ReadingForm onSaved={loadAll} />

        {/* 7-day trend */}
        <section className="glass-card rounded-2xl p-6 border border-border">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <LineIcon className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold">Last 7 days</h2>
            <span className="text-xs text-muted-foreground sm:ml-auto">Green band = normal range (70–140)</span>
          </div>
          <GlucoseChart data={chartData} />
        </section>

        {/* AI insights */}
        <InsightsPanel readings={readings} />

        {/* Reminders */}
        <RemindersPanel />

        {/* History table */}
        <section className="glass-card rounded-2xl p-6 border border-border">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <History className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">History</h2>
            <span className="text-xs text-muted-foreground">{readings.length} readings</span>
            <Button size="sm" variant="outline" className="ml-auto" onClick={downloadPdf}>
              <Download className="w-4 h-4 mr-2" /> Export PDF
            </Button>
          </div>

          {readings.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No readings yet.</div>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-2 py-2 font-medium">Date / Time</th>
                    <th className="text-left px-2 py-2 font-medium">Value</th>
                    <th className="text-left px-2 py-2 font-medium hidden sm:table-cell">Status</th>
                    <th className="text-left px-2 py-2 font-medium hidden md:table-cell">Context</th>
                    <th className="text-right px-2 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {readings.map((r) => {
                    const c = classify(r.value);
                    const colorClass =
                      c.tone === "destructive" ? "text-destructive bg-destructive/10" :
                      c.tone === "warning" ? "text-warning bg-warning/10" :
                      "text-success bg-success/10";
                    return (
                      <tr key={r.id} className="border-t border-border hover:bg-secondary/30 transition-colors">
                        <td className="px-2 py-2.5 text-muted-foreground whitespace-nowrap">
                          {format(new Date(r.measured_at), "MMM d, HH:mm")}
                        </td>
                        <td className="px-2 py-2.5">
                          <span className={`inline-flex w-12 h-9 items-center justify-center rounded-lg font-bold ${colorClass}`}>
                            {r.value}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 hidden sm:table-cell">
                          <span className={`text-xs font-medium ${c.tone === "destructive" ? "text-destructive" : c.tone === "warning" ? "text-warning" : "text-success"}`}>
                            {c.label}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 hidden md:table-cell text-muted-foreground text-xs">{mealLabel(r.meal_context)}</td>
                        <td className="px-2 py-2.5 text-right">
                          <Button size="icon" variant="ghost" onClick={() => remove(r.id)} aria-label="Delete">
                            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive transition-colors" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* FAQ */}
        <FAQ />

        <div className="text-xs text-muted-foreground flex items-center justify-center gap-1.5 pt-4">
          <AlertCircle className="w-3.5 h-3.5" />
          GlucoTrack supports your care — it doesn't replace your doctor.
        </div>
      </main>
      <Chatbot />
      <EmergencyButton />
    </div>
  );
}

function SummaryCard({
  icon: Icon, label, value, sub, tone,
}: {
  icon: any; label: string; value: string; sub: string;
  tone: "primary" | "accent" | "warning" | "destructive" | "muted";
}) {
  const toneCls =
    tone === "primary" ? "text-primary bg-primary/10" :
    tone === "accent" ? "text-accent bg-accent/10" :
    tone === "warning" ? "text-warning bg-warning/10" :
    tone === "destructive" ? "text-destructive bg-destructive/10" :
    "text-muted-foreground bg-muted/20";
  return (
    <div className="glass-card rounded-2xl p-4 border border-border hover:border-primary/30 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${toneCls} flex items-center justify-center shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold leading-tight truncate">{value}</div>
          <div className="text-[11px] text-muted-foreground truncate">{sub}</div>
        </div>
      </div>
    </div>
  );
}
