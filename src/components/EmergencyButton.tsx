import { useEffect, useState } from "react";
import { Phone, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Link } from "react-router-dom";

export function EmergencyButton() {
  const { user } = useAuth();
  const [contact, setContact] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("emergency_contact").eq("id", user.id).maybeSingle()
      .then(({ data }) => setContact(data?.emergency_contact ?? null));
  }, [user]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="fixed bottom-24 left-4 sm:left-6 z-40 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-destructive text-destructive-foreground shadow-lg hover:scale-105 transition-transform"
          aria-label="Emergency"
        >
          <Phone className="w-4 h-4" />
          <span className="text-sm font-semibold">Emergency</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Phone className="w-4 h-4 text-destructive" /> Emergency contact</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {contact ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4">
              <div className="text-xs uppercase tracking-wider text-destructive/80 mb-1">Your contact</div>
              <div className="font-semibold text-foreground break-words">{contact}</div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
              No emergency contact set. <Link to="/profile" className="text-primary underline">Add one in your profile</Link>.
            </div>
          )}
          <div className="rounded-xl border border-border bg-secondary/30 p-4 text-sm">
            <div className="font-medium mb-1">In a medical emergency:</div>
            <ul className="text-muted-foreground space-y-1 text-xs">
              <li>• If unconscious or seizing — call your local emergency number now.</li>
              <li>• Severe hypoglycemia (&lt; 54 mg/dL): use glucagon if prescribed, or fast-acting sugar.</li>
              <li>• Very high readings (&gt; 300 mg/dL) with symptoms: contact your doctor urgently.</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
