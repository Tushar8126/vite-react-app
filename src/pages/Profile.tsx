import { useEffect, useState } from "react";
import { Loader2, Save, User as UserIcon, ArrowLeft, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function Profile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [age, setAge] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [diabetesType, setDiabetesType] = useState<string>("none");
  const [history, setHistory] = useState("");
  const [emergency, setEmergency] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("age, weight_kg, diabetes_type, medical_history, emergency_contact")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setAge(data.age?.toString() ?? "");
        setWeight(data.weight_kg?.toString() ?? "");
        setDiabetesType(data.diabetes_type ?? "none");
        setHistory(data.medical_history ?? "");
        setEmergency(data.emergency_contact ?? "");
      }
      setLoading(false);
    })();
  }, [user]);

  async function save() {
    if (!user) return;
    setSaving(true);
    const ageNum = age ? parseInt(age, 10) : null;
    const wNum = weight ? parseFloat(weight) : null;
    const { error } = await supabase
      .from("profiles")
      .update({
        age: ageNum,
        weight_kg: wNum,
        diabetes_type: diabetesType === "none" ? null : diabetesType,
        medical_history: history || null,
        emergency_contact: emergency || null,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error("Failed to save");
    else toast.success("Profile updated");
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button asChild variant="ghost" size="sm"><Link to="/dashboard"><ArrowLeft className="w-4 h-4 mr-2" />Dashboard</Link></Button>
        </div>

        <div className="glass-card rounded-2xl p-6 border border-border animate-fade-in-up">
          <div className="flex items-center gap-2 mb-6">
            <UserIcon className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold">Your profile</h1>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin" />Loading…</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input id="age" type="number" min={1} max={120} value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 42" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input id="weight" type="number" step="0.1" min={1} max={500} value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 72.5" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Diabetes type</Label>
                <Select value={diabetesType} onValueChange={setDiabetesType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not specified</SelectItem>
                    <SelectItem value="type1">Type 1</SelectItem>
                    <SelectItem value="type2">Type 2</SelectItem>
                    <SelectItem value="gestational">Gestational</SelectItem>
                    <SelectItem value="prediabetes">Prediabetes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="history">Medical history (basic)</Label>
                <Textarea id="history" rows={4} maxLength={1000} value={history} onChange={(e) => setHistory(e.target.value)} placeholder="Allergies, medications, conditions…" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="emergency"><span className="inline-flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> Emergency contact</span></Label>
                <Input id="emergency" maxLength={120} value={emergency} onChange={(e) => setEmergency(e.target.value)} placeholder="Name + phone, e.g. Jane (+1 555 010 9999)" />
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <Button onClick={save} disabled={saving} className="bg-gradient-primary text-primary-foreground hover:opacity-90 transition-opacity">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save changes
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
