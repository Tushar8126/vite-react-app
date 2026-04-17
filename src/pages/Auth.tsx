import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, ArrowLeft, Loader2, ShieldCheck, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, usernameToEmail } from "@/hooks/useAuth";
import { passwordIssues, sha256, SECURITY_QUESTIONS } from "@/lib/security";

type Mode = "login" | "register" | "forgot";

export default function Auth() {
  const nav = useNavigate();
  const { user, role, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("login");

  // shared
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // register-only
  const [confirm, setConfirm] = useState("");
  const [securityQ, setSecurityQ] = useState(SECURITY_QUESTIONS[0]);
  const [securityA, setSecurityA] = useState("");

  // forgot-password
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotQuestion, setForgotQuestion] = useState("");
  const [forgotAnswer, setForgotAnswer] = useState("");
  const [newPw, setNewPw] = useState("");

  useEffect(() => {
    supabase.functions.invoke("seed-admin").catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading && user) {
      nav(role === "admin" ? "/admin" : "/dashboard", { replace: true });
    }
  }, [user, role, loading, nav]);

  const pwIssues = passwordIssues(password);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return toast.error("Enter username and password");
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(username), password });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || username.trim().length < 3) return toast.error("Username must be at least 3 characters");
    if (pwIssues.length) return toast.error("Password too weak: " + pwIssues.join(", "));
    if (password !== confirm) return toast.error("Passwords do not match");
    if (!securityA.trim()) return toast.error("Set a security answer for password recovery");

    setSubmitting(true);
    try {
      const email = usernameToEmail(username);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { username: username.trim().toLowerCase() },
        },
      });
      if (error) throw error;
      // Save security question/answer (hashed) on profile
      const uid = data.user?.id;
      if (uid) {
        const hash = await sha256(securityA);
        // Profile row was created by trigger; update it
        await supabase
          .from("profiles")
          .update({ security_question: securityQ, security_answer_hash: hash })
          .eq("id", uid);
      }
      toast.success("Account created! Logging you in…");
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgotLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return toast.error("Enter your username");
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("get_security_question", { _username: username.trim() });
      if (error) throw error;
      if (!data) return toast.error("No security question set for this account");
      setForgotQuestion(String(data));
      setForgotStep(2);
    } catch (err: any) {
      toast.error(err.message || "Lookup failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    const issues = passwordIssues(newPw);
    if (issues.length) return toast.error("Password too weak: " + issues.join(", "));
    if (!forgotAnswer.trim()) return toast.error("Enter your security answer");
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("reset-password", {
        body: { username: username.trim(), answer: forgotAnswer, newPassword: newPw },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Password reset! Sign in with your new password.");
      setMode("login");
      setPassword("");
      setForgotStep(1);
      setForgotAnswer("");
      setNewPw("");
    } catch (err: any) {
      toast.error(err.message || "Reset failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-primary mb-4 glow">
            <Activity className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-gradient">GlucoTrack</h1>
          <p className="text-muted-foreground mt-2">Smart Diabetes Monitoring &amp; Management</p>
        </div>

        <div className="glass-card rounded-2xl p-6 border border-border">
          {mode !== "forgot" ? (
            <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <TabsList className="grid grid-cols-2 w-full mb-6">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <Field id="login-username" label="Username" value={username} onChange={setUsername} placeholder="e.g. john" autoComplete="username" />
                  <Field id="login-password" label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" autoComplete="current-password" />
                  <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 transition-opacity" disabled={submitting}>
                    {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Sign In
                  </Button>
                  <button type="button" onClick={() => { setMode("forgot"); setForgotStep(1); }} className="w-full text-xs text-muted-foreground hover:text-primary transition-colors">
                    Forgot password?
                  </button>
                </form>
                <div className="mt-6 rounded-lg border border-border p-3 bg-secondary/30 text-xs flex items-start gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">
                    Your data is private. Each patient sees only their own readings.
                  </span>
                </div>
              </TabsContent>

              <TabsContent value="register" className="mt-0">
                <form onSubmit={handleRegister} className="space-y-4">
                  <Field id="reg-username" label="Username" value={username} onChange={setUsername} placeholder="3+ chars, letters/numbers" autoComplete="username" />
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Password</Label>
                    <Input id="reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" required />
                    {password && pwIssues.length > 0 && (
                      <ul className="text-xs text-muted-foreground space-y-0.5 pl-1">
                        {pwIssues.map((r) => (<li key={r}>• {r}</li>))}
                      </ul>
                    )}
                  </div>
                  <Field id="reg-confirm" label="Confirm password" type="password" value={confirm} onChange={setConfirm} placeholder="••••••••" autoComplete="new-password" />
                  <div className="space-y-2">
                    <Label>Security question</Label>
                    <Select value={securityQ} onValueChange={setSecurityQ}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SECURITY_QUESTIONS.map((q) => (<SelectItem key={q} value={q}>{q}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Field id="reg-answer" label="Your answer" value={securityA} onChange={setSecurityA} placeholder="Used for password reset" />
                  <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 transition-opacity" disabled={submitting}>
                    {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Create Account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          ) : (
            <div>
              <button type="button" onClick={() => { setMode("login"); setForgotStep(1); }} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4 transition-colors">
                <ArrowLeft className="w-3 h-3" /> Back to sign in
              </button>
              <h2 className="font-semibold mb-1">Reset password</h2>
              <p className="text-xs text-muted-foreground mb-4">Answer your security question to set a new password.</p>

              {forgotStep === 1 ? (
                <form onSubmit={handleForgotLookup} className="space-y-4">
                  <Field id="forgot-username" label="Username" value={username} onChange={setUsername} placeholder="Your username" autoComplete="username" />
                  <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground" disabled={submitting}>
                    {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Continue
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="rounded-lg bg-secondary/40 border border-border p-3 text-sm">
                    <span className="text-muted-foreground">Question:</span> {forgotQuestion}
                  </div>
                  <Field id="forgot-answer" label="Your answer" value={forgotAnswer} onChange={setForgotAnswer} placeholder="Case-insensitive" />
                  <div className="space-y-2">
                    <Label htmlFor="forgot-newpw">New password</Label>
                    <Input id="forgot-newpw" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="••••••••" />
                    {newPw && passwordIssues(newPw).length > 0 && (
                      <ul className="text-xs text-muted-foreground space-y-0.5 pl-1">
                        {passwordIssues(newPw).map((r) => (<li key={r}>• {r}</li>))}
                      </ul>
                    )}
                  </div>
                  <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground" disabled={submitting}>
                    {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Reset password
                  </Button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  id, label, value, onChange, placeholder, type = "text", autoComplete,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; autoComplete?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete={autoComplete} required />
    </div>
  );
}
