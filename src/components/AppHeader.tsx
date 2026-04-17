import { Activity, LogOut, ShieldCheck, User as UserIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { NotificationBell } from "@/components/NotificationBell";

export function AppHeader({ showBell = true, showProfile = true }: { showBell?: boolean; showProfile?: boolean }) {
  const { username, role, signOut } = useAuth();
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to={role === "admin" ? "/admin" : "/dashboard"} className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
          <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center glow">
            <Activity className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-bold leading-tight text-gradient">GlucoTrack</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {role === "admin" ? "Admin Panel" : "Patient Dashboard"}
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {showBell && role !== "admin" && <NotificationBell />}
          {showProfile && role !== "admin" && (
            <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
              <Link to="/profile"><UserIcon className="w-4 h-4 mr-2" />Profile</Link>
            </Button>
          )}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border text-sm">
            {role === "admin" ? <ShieldCheck className="w-4 h-4 text-accent" /> : <UserIcon className="w-4 h-4 text-primary" />}
            <span className="font-medium">{username}</span>
          </div>
          <Button size="sm" variant="ghost" onClick={signOut}>
            <LogOut className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
