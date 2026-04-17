import { useEffect, useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { AlertTriangle, Database, Eye, Trash2, Users, Activity, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { Chatbot } from "@/components/Chatbot";
import { GlucoseChart } from "@/components/GlucoseChart";
import { classify, MEAL_CONTEXTS } from "@/lib/glucose";
import { supabase } from "@/integrations/supabase/client";

interface Row {
  id: string;
  value: number;
  status: string;
  meal_context: string | null;
  measured_at: string;
  created_at: string;
  user_id: string;
}
interface Profile {
  id: string;
  username: string;
  created_at: string;
}

const mealLabel = (v: string | null) => MEAL_CONTEXTS.find((m) => m.value === v)?.label ?? "—";

export default function Admin() {
  const [readings, setReadings] = useState<Row[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [viewing, setViewing] = useState<Profile | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const [{ data: rs }, { data: ps }] = await Promise.all([
      supabase.from("readings").select("id, value, status, meal_context, measured_at, created_at, user_id").order("measured_at", { ascending: false }),
      supabase.from("profiles").select("id, username, created_at").order("created_at", { ascending: false }),
    ]);
    setReadings((rs ?? []) as Row[]);
    setProfiles((ps ?? []) as Profile[]);
  }

  async function deleteReading(id: string) {
    const { error } = await supabase.from("readings").delete().eq("id", id);
    if (error) return toast.error("Failed");
    setReadings((r) => r.filter((x) => x.id !== id));
    toast.success("Reading deleted");
  }

  async function deleteUser(id: string) {
    if (!confirm("Delete this user's profile and all their data?")) return;
    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) return toast.error("Failed: " + error.message);
    setProfiles((p) => p.filter((x) => x.id !== id));
    setReadings((r) => r.filter((x) => x.user_id !== id));
    toast.success("User profile removed");
  }

  const userMap = useMemo(() => Object.fromEntries(profiles.map((p) => [p.id, p.username])), [profiles]);
  const totalUsers = profiles.length;
  const totalReadings = readings.length;
  const highCases = readings.filter((r) => r.value > 140).length;

  // Active patients = at least one reading in the last 7 days
  const activeCutoff = subDays(new Date(), 7);
  const activeIds = new Set(readings.filter((r) => new Date(r.measured_at) >= activeCutoff).map((r) => r.user_id));
  const activePatients = activeIds.size;

  // Critical = users with at least one reading >250 or <55 in last 7 days
  const criticalIds = new Set(
    readings
      .filter((r) => new Date(r.measured_at) >= activeCutoff && (r.value > 250 || r.value < 55))
      .map((r) => r.user_id)
  );
  const criticalCases = criticalIds.size;

  const viewingReadings = useMemo(
    () => viewing ? readings.filter((r) => r.user_id === viewing.id) : [],
    [viewing, readings]
  );
  const viewingChart = useMemo(
    () => [...viewingReadings].reverse().slice(-30).map((r) => ({
      time: format(new Date(r.measured_at), "MMM d HH:mm"),
      value: r.value,
    })),
    [viewingReadings]
  );

  return (
    <div className="min-h-screen">
      <AppHeader showBell={false} showProfile={false} />
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Stat icon={Users} label="Total users" value={totalUsers} tone="primary" />
          <Stat icon={Activity} label="Active patients (7d)" value={activePatients} tone="accent" />
          <Stat icon={Database} label="Total readings" value={totalReadings} tone="primary" />
          <Stat icon={AlertTriangle} label="Critical cases (7d)" value={criticalCases} tone="destructive" />
        </section>

        <section className="glass-card rounded-2xl p-6 border border-border">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Patients
            <span className="text-xs text-muted-foreground ml-auto">{profiles.length} total</span>
          </h2>
          {profiles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users yet.</p>
          ) : (
            <div className="space-y-2">
              {profiles.map((p) => {
                const userReadings = readings.filter((r) => r.user_id === p.id);
                const isCritical = criticalIds.has(p.id);
                const isActive = activeIds.has(p.id);
                return (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border hover:bg-secondary/50 transition-colors">
                    <div className="min-w-0">
                      <div className="font-medium flex items-center gap-2 flex-wrap">
                        {p.username}
                        {isCritical && <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-destructive/15 text-destructive">Critical</span>}
                        {isActive && !isCritical && <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-success/15 text-success">Active</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Joined {new Date(p.created_at).toLocaleDateString()} · {userReadings.length} readings
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setViewing(p)} aria-label="View logs (read-only)">
                        <Eye className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteUser(p.id)} aria-label="Delete user">
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive transition-colors" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="glass-card rounded-2xl p-6 border border-border">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-accent" /> All readings
          </h2>
          {readings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No readings yet.</p>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-2 py-2 font-medium">User</th>
                    <th className="text-left px-2 py-2 font-medium">Value</th>
                    <th className="text-left px-2 py-2 font-medium hidden sm:table-cell">Context</th>
                    <th className="text-left px-2 py-2 font-medium">Time</th>
                    <th className="text-right px-2 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {readings.slice(0, 100).map((r) => {
                    const c = classify(r.value);
                    const colorClass =
                      c.tone === "destructive" ? "text-destructive bg-destructive/10" :
                      c.tone === "warning" ? "text-warning bg-warning/10" :
                      "text-success bg-success/10";
                    return (
                      <tr key={r.id} className="border-t border-border hover:bg-secondary/30 transition-colors">
                        <td className="px-2 py-2.5 font-medium">{userMap[r.user_id] ?? "Unknown"}</td>
                        <td className="px-2 py-2.5">
                          <span className={`inline-flex w-12 h-9 items-center justify-center rounded-lg font-bold ${colorClass}`}>
                            {r.value}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 hidden sm:table-cell text-muted-foreground text-xs">{mealLabel(r.meal_context)}</td>
                        <td className="px-2 py-2.5 text-muted-foreground whitespace-nowrap text-xs">
                          {format(new Date(r.measured_at), "MMM d, HH:mm")}
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          <Button size="icon" variant="ghost" onClick={() => deleteReading(r.id)} aria-label="Delete">
                            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive transition-colors" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {readings.length > 100 && (
                <p className="text-xs text-muted-foreground mt-3 text-center">Showing latest 100 of {readings.length}.</p>
              )}
            </div>
          )}
        </section>
      </main>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              Patient log: {viewing?.username}
              <span className="ml-2 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">Read-only</span>
            </DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4">
              <div className="text-xs text-muted-foreground">
                {viewingReadings.length} total readings · joined {new Date(viewing.created_at).toLocaleDateString()}
              </div>
              <GlucoseChart data={viewingChart} />
              <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground sticky top-0 bg-card">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Time</th>
                      <th className="text-left px-3 py-2 font-medium">Value</th>
                      <th className="text-left px-3 py-2 font-medium">Context</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingReadings.map((r) => (
                      <tr key={r.id} className="border-t border-border">
                        <td className="px-3 py-2 text-muted-foreground text-xs whitespace-nowrap">{format(new Date(r.measured_at), "MMM d, HH:mm")}</td>
                        <td className="px-3 py-2 font-semibold">{r.value}</td>
                        <td className="px-3 py-2 text-muted-foreground text-xs">{mealLabel(r.meal_context)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Chatbot />
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: "primary" | "accent" | "destructive" }) {
  const toneCls =
    tone === "primary" ? "text-primary bg-primary/10" :
    tone === "accent" ? "text-accent bg-accent/10" :
    "text-destructive bg-destructive/10";
  return (
    <div className="glass-card rounded-2xl p-4 border border-border hover:border-primary/30 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${toneCls} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
      </div>
    </div>
  );
}
