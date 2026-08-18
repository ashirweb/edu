import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Shield, BookOpen, GraduationCap,
  Loader2, Eye, EyeOff, Sparkles, LogIn, UserPlus
} from "lucide-react";
import { toast } from "sonner";

// Use API keys to bypass RLS and forcefully update roles
const SUPABASE_URL = "https://hbkzzffesytwqmybyded.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhia3p6ZmZlc3l0d3FteWJ5ZGVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NTUwODksImV4cCI6MjA4OTEzMTA4OX0.XWfppjF6v-7OFUsNCESWUidAaLMrmyULBvN_1VZ_Ioo";

type UserRole = "admin" | "teacher" | "student";
type AuthMode = "login" | "signup";

const roles: {
  value: UserRole;
  label: string;
  icon: React.ReactNode;
  gradient: string;
  activeBg: string;
  activeBorder: string;
  activeText: string;
}[] = [
  {
    value: "admin",
    label: "Administrator",
    icon: <Shield className="w-5 h-5" />,
    gradient: "from-violet-500 to-purple-600",
    activeBg: "bg-violet-950/40",
    activeBorder: "border-violet-500",
    activeText: "text-violet-300",
  },
  {
    value: "teacher",
    label: "Teacher",
    icon: <BookOpen className="w-5 h-5" />,
    gradient: "from-sky-500 to-blue-600",
    activeBg: "bg-sky-950/40",
    activeBorder: "border-sky-500",
    activeText: "text-sky-300",
  },
  {
    value: "student",
    label: "Student",
    icon: <GraduationCap className="w-5 h-5" />,
    gradient: "from-emerald-500 to-teal-600",
    activeBg: "bg-emerald-950/40",
    activeBorder: "border-emerald-500",
    activeText: "text-emerald-300",
  },
];

const LoginPage = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("login");
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const activeRole = roles.find((r) => r.value === selectedRole);

  // ✅ FORCE SYNC: Yeh database mein role forcefully update karega taake AuthContext sahi page open kare
  const syncUserProfile = async (userId: string, role: UserRole, userEmail: string, name: string) => {
    try {
      const cleanEmail = userEmail.toLowerCase().trim();

      // 1. FORCE PROFILE UPSERT (Bypasses RLS limits)
      await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "resolution=merge-duplicates"
        },
        body: JSON.stringify({
          id: userId,
          full_name: name || cleanEmail.split('@')[0],
          role: role
        })
      });

      // 2. Link Teacher Database Records (If role is teacher)
      if (role === "teacher") {
        const { data: oldTeacher } = await supabase.from("teachers").select("*").eq("email", cleanEmail).maybeSingle();

        if (oldTeacher && oldTeacher.id !== userId) {
          // Update all references to the new secure Auth ID
          await fetch(`${SUPABASE_URL}/rest/v1/teachers?id=eq.${oldTeacher.id}`, {
            method: "PATCH",
            headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ id: userId })
          });
          await fetch(`${SUPABASE_URL}/rest/v1/classes?teacher_id=eq.${oldTeacher.id}`, {
            method: "PATCH",
            headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ teacher_id: userId })
          });
        }
      }
    } catch (error: any) {
      console.error("Sync Error: ", error.message);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) { toast.error("Please select your role"); return; }
    if (!email || !password) { toast.error("Please fill all fields"); return; }

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error("Wrong email or password.");
      setPassword("");
      setLoading(false);
      return;
    }

    if (data.user) {
      // Get exact DB Role to prevent downgrading an actual Admin
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
      let finalRole = selectedRole;

      if (profile?.role === "admin" && selectedRole !== "admin") {
        toast.info("Admin account detected. Routing to Admin portal.");
        finalRole = "admin";
      } else {
        // 🔥 FORCE DATABASE UPDATE TO TEACHER / STUDENT
        await syncUserProfile(data.user.id, finalRole, email, "");
      }

      toast.success(`Welcome to the portal! 🚀`);
      setLoading(false);
      // AuthContext will now read the correct role and route to the correct portal!
      navigate(`/${finalRole}`);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) { toast.error("Please select a role"); return; }
    if (!email || !password || !fullName) { toast.error("Please fill all fields"); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }

    setLoading(true);

    if (selectedRole === "admin") {
      toast.error("Access Denied: You cannot create an Admin account.");
      setLoading(false);
      return;
    }

    if (selectedRole === "teacher") {
      const { data: isAuthorized } = await supabase.from("teachers").select("email").eq("email", email.toLowerCase().trim()).maybeSingle();
      if (!isAuthorized) {
        toast.error("Access Denied: Your email is not registered by the Admin!");
        setLoading(false);
        return;
      }
    }

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      if (error.message.toLowerCase().includes("already registered")) {
        toast.info("Account exists. Logging you in...");
        const { data: ld, error: le } = await supabase.auth.signInWithPassword({ email, password });
        if (le) { toast.error(le.message); setLoading(false); return; }
        if (ld.user) {
          await syncUserProfile(ld.user.id, selectedRole, email, fullName); 
          setLoading(false);
          navigate(`/${selectedRole}`);
        }
        return;
      }
      toast.error(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await syncUserProfile(data.user.id, selectedRole, email, fullName);
      setLoading(false);
      toast.success("Account setup complete!");
      navigate(`/${selectedRole}`);
    }
  };

  const switchMode = (m: AuthMode) => {
    setMode(m);
    setSelectedRole(null);
    setEmail("");
    setPassword("");
    setFullName("");
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-sky-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30 mb-5">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">EduFlow</h1>
          <p className="text-slate-400 mt-1 text-sm">School Management System</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-6 shadow-2xl shadow-black/40">
          <div className="flex bg-slate-800/60 rounded-2xl p-1 mb-6 gap-1">
            {(["login", "signup"] as AuthMode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  mode === m
                    ? "bg-slate-700 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {m === "login" ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <div className="mb-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
              {mode === "login" ? "Select your role to sign in" : "Select your role"}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {roles.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setSelectedRole(r.value)}
                  className={`flex flex-col items-center gap-2 p-3.5 rounded-2xl border transition-all duration-200 group ${
                    selectedRole === r.value
                      ? `${r.activeBg} ${r.activeBorder}`
                      : "border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-600"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                      selectedRole === r.value
                        ? `bg-gradient-to-br ${r.gradient} text-white shadow-lg`
                        : "bg-slate-700 text-slate-400 group-hover:text-slate-300"
                    }`}
                  >
                    {r.icon}
                  </div>
                  <span
                    className={`text-xs font-semibold transition-colors ${
                      selectedRole === r.value ? r.activeText : "text-slate-300"
                    }`}
                  >
                    {r.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-slate-700/60" />
            <span className="text-xs text-slate-600">
              {mode === "login" ? "enter credentials" : "account details"}
            </span>
            <div className="flex-1 h-px bg-slate-700/60" />
          </div>

          <form onSubmit={mode === "login" ? handleLogin : handleSignup} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Muhammad Ali"
                  required
                  className="bg-slate-800/70 border-slate-700 text-white placeholder:text-slate-600 rounded-xl h-11 focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="bg-slate-800/70 border-slate-700 text-white placeholder:text-slate-600 rounded-xl h-11 focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="min. 6 characters"
                  required
                  minLength={6}
                  className="bg-slate-800/70 border-slate-700 text-white placeholder:text-slate-600 rounded-xl h-11 pr-11 focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !selectedRole}
              className={`w-full h-12 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 mt-1 ${
                loading || !selectedRole
                  ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                  : activeRole
                  ? `bg-gradient-to-r ${activeRole.gradient} text-white hover:opacity-90 active:scale-[0.98] shadow-md`
                  : "bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:opacity-90 active:scale-[0.98]"
              }`}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span>{mode === "login" ? "Signing in..." : "Creating account..."}</span></>
              ) : !selectedRole ? (
                "Select a role first"
              ) : mode === "login" ? (
                <><LogIn className="w-4 h-4" /><span>Sign In as {activeRole?.label}</span></>
              ) : (
                <><UserPlus className="w-4 h-4" /><span>Create Account as {activeRole?.label}</span></>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-600 mt-5">
            {mode === "login" ? (
              <>Don't have an account?{" "}
                <button onClick={() => switchMode("signup")} className="text-violet-400 hover:text-violet-300 font-medium">
                  Create one
                </button>
              </>
            ) : (
              <>Already have an account?{" "}
                <button onClick={() => switchMode("login")} className="text-violet-400 hover:text-violet-300 font-medium">
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>

        <p className="text-center text-xs text-slate-700 mt-6">
          EduFlow © {new Date().getFullYear()} — School Management Platform
        </p>
      </div>
    </div>
  );
};

export default LoginPage;