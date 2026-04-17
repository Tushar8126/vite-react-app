import { useEffect, useState } from "react";
import { Bell, Check, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface Alert {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [open, setOpen] = useState(false);

  async function load() {
    if (!user) return;
    const { data } = await supabase
      .from("alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setAlerts((data ?? []) as Alert[]);
  }

  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("alerts-bell")
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const unread = alerts.filter((a) => !a.read).length;

  async function markAllRead() {
    if (!user || unread === 0) return;
    await supabase.from("alerts").update({ read: true }).eq("user_id", user.id).eq("read", false);
    load();
  }
  async function dismiss(id: string) {
    await supabase.from("alerts").delete().eq("id", id);
    load();
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost" className="relative" aria-label="Notifications">
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className="font-semibold text-sm">Notifications</div>
          {unread > 0 && (
            <button onClick={markAllRead} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
              <Check className="w-3 h-3" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">You're all caught up.</div>
          ) : (
            alerts.map((a) => {
              const tone =
                a.severity === "critical" ? "border-l-destructive" :
                a.severity === "warning" ? "border-l-warning" :
                "border-l-primary";
              return (
                <div key={a.id} className={`p-3 border-b border-border border-l-2 ${tone} ${!a.read ? "bg-secondary/30" : ""} group`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{a.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{a.message}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">{new Date(a.created_at).toLocaleString()}</div>
                    </div>
                    <button onClick={() => dismiss(a.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-secondary" aria-label="Dismiss">
                      <Trash2 className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
