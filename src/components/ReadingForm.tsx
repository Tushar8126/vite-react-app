import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Droplet, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { classify, MEAL_CONTEXTS, type MealContext } from "@/lib/glucose";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { StatusCard } from "@/components/StatusCard";

export function ReadingForm({ onSaved }: { onSaved: () => void }) {
  const { user } = useAuth();
  const [valueStr, setValueStr] = useState("");
  const [meal, setMeal] = useState<MealContext>("random");
  const [date, setDate] = useState<Date>(new Date());
  const [time, setTime] = useState<string>(format(new Date(), "HH:mm"));
  const [saving, setSaving] = useState(false);

  const n = parseInt(valueStr, 10);
  const validValue = !isNaN(n) && n >= 0 && n <= 500;
  const info = validValue ? classify(n) : null;

  async function save() {
    if (!user || !validValue) return toast.error("Enter a value between 0 and 500");
    if (!/^\d{2}:\d{2}$/.test(time)) return toast.error("Invalid time");
    setSaving(true);
    const [hh, mm] = time.split(":").map(Number);
    const measured = new Date(date);
    measured.setHours(hh, mm, 0, 0);

    const cls = classify(n);

    const { error } = await supabase.from("readings").insert({
      user_id: user.id,
      value: n,
      status: cls.status,
      meal_context: meal,
      measured_at: measured.toISOString(),
    });

    if (!error && (cls.status === "high" || cls.status === "low")) {
      await supabase.from("alerts").insert({
        user_id: user.id,
        severity: cls.status === "high" ? "warning" : "critical",
        title: cls.status === "high" ? "High glucose alert" : "Low glucose alert",
        message: `Reading ${n} mg/dL (${cls.title}). ${cls.suggestions[0]}.`,
      });
    }

    setSaving(false);
    if (error) return toast.error("Failed to save");
    toast.success("Reading saved");
    setValueStr("");
    onSaved();
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="glass-card rounded-2xl p-6 border border-border animate-fade-in-up">
        <div className="flex items-center gap-2 mb-4">
          <Droplet className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Log a reading</h2>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="glucose">Blood glucose (mg/dL)</Label>
            <Input
              id="glucose" type="number" inputMode="numeric" min={0} max={500}
              value={valueStr} onChange={(e) => setValueStr(e.target.value)}
              placeholder="e.g. 110" className="text-2xl h-14 font-semibold transition-shadow focus-visible:ring-primary"
            />
            <p className="text-xs text-muted-foreground">Accepted range: 0–500</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Meal context</Label>
              <Select value={meal} onValueChange={(v) => setMeal(v as MealContext)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MEAL_CONTEXTS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="w-4 h-4 mr-2" /> {format(date, "MMM d, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} disabled={(d) => d > new Date()} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="time">Time</Label>
              <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          <Button
            onClick={save} disabled={saving || !validValue}
            className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Save reading
          </Button>
        </div>
      </div>

      <div>
        {info && validValue ? (
          <StatusCard info={info} value={n} />
        ) : (
          <div className="glass-card rounded-2xl border border-dashed border-border p-6 h-full flex items-center justify-center text-center text-muted-foreground">
            Enter a glucose value to see status &amp; recommendations instantly.
          </div>
        )}
      </div>
    </div>
  );
}
