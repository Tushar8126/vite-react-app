import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

function FullPageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );
}

export function RequirePatient({ children }: { children: JSX.Element }) {
  const { user, role, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  if (role === "admin") return <Navigate to="/admin" replace />;
  return children;
}

export function RequireAdmin({ children }: { children: JSX.Element }) {
  const { user, role, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  if (role !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
}

export function RedirectHome() {
  const { user, role, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  return <Navigate to={role === "admin" ? "/admin" : "/dashboard"} replace />;
}
