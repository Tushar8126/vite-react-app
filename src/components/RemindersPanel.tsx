import { useEffect, useState } from "react";
import { Bell, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Reminder {
  id: string;
  kind: "medication" | "glucose_check";
  label: string;
  time_of_day: string;
  enabled: boolean;
}

export function RemindersPanel() {
  const { user } = useAuth();
  const [items, setItems] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<"medication" | "glucose_check">("medication");
  const [label, setLabel] = useState("");
  const [time, setTime] = useState("08:00");
  const [adding, setAdding] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("reminders").select("*").order("time_of_day");
    setItems((data ?? []) as Reminder[]);
    setLoading(false);
  }
  useEffect(() => { if (user) load(); }, [user]);

  // Fire alerts in-app when a reminder time matches "now" (HH:MM)
  useEffect(() => {
    if (!user) return;
    const tick = async () => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const due = items.filter((r) => r.enabled && r.time_of_day === hhmm);
      for (const r of due) {
        await supabase.from("alerts").insert({
          user_id: user.id,
          severity: "info",
          title: r.kind === "medication" ? "Medication reminder" : "Glucose check reminder",
          message: r.label || (r.kind === "medication" ? "Time to take your medication." : "Time to log a glucose reading."),
        });
      }
    };
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [items, user]);

  async function add() {
    if (!user) return;
    if (!label.trim()) return toast.error("Add a label");
    if (!/^\d{2}:\d{2}$/.test(time)) return toast.error("Invalid time");
    setAdding(true);
    const { error } = await supabase.from("reminders").insert({
      user_id: user.id, kind, label: label.trim(), time_of_day: time, enabled: true,
    });
    setAdding(false);
    if (error) return toast.error("Failed");
    setLabel("");
    load();
  }

  async function toggle(r: Reminder, on: boolean) {
    await supabase.from("reminders").update({ enabled: on }).eq("id", r.id);
    setItems((arr) => arr.map((x) => x.id === r.id ? { ...x, enabled: on } : x));
  }

  async function remove(id: string) {
    await supabase.from("reminders").delete().eq("id", id);
    setItems((arr) => arr.filter((x) => x.id !== id));
  }

  return (
    <div className="glass-card rounded-2xl p-6 border border-border">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-5 h-5 text-accent" />
        <h2 className="text-lg font-semibold">Reminders</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr_120px_auto] gap-2 mb-4">
        <Select value={kind} onValueChange={(v) => setKind(v as any)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="medication">Medication</SelectItem>
            <SelectItem value="glucose_check">Glucose check</SelectItem>
          </SelectContent>
        </Select>
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Metformin 500mg" maxLength={120} />
        <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        <Button onClick={add} disabled={adding} className="bg-gradient-primary text-primary-foreground hover:opacity-90 transition-opacity">
          {adding ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />} Add
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-muted-foreground py-4 text-center">No reminders yet. Add one above.</div>
      ) : (
        <ul className="space-y-2">
          {items.map((r) => (
            <li key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="font-mono text-sm tabular-nums text-foreground">{r.time_of_day}</div>
                <div>
                  <div className="text-sm font-medium">{r.label}</div>
                  <div className="text-xs text-muted-foreground capitalize">{r.kind.replace("_", " ")}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={r.enabled} onCheckedChange={(on) => toggle(r, on)} />
                <Button size="icon" variant="ghost" onClick={() => remove(r.id)} aria-label="Delete">
                  <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
