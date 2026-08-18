import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type UserRole = "admin" | "teacher" | "student";

interface AuthContextType {
  isLoggedIn: boolean;
  isLoading: boolean;
  role: UserRole | null;
  userName: string;
  user: User | null;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signup: (email: string, password: string, fullName: string, role: UserRole) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [userName, setUserName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserRole = async (userId: string) => {
    console.log("[AuthContext] Fetching role for:", userId);

    try {
      // Check profiles table (admin)
      const { data: adminData, error: adminError } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", userId)
        .maybeSingle();

      console.log("[AuthContext] profiles result:", adminData, "error:", adminError);

      if (adminData) {
        setRole("admin");
        setUserName(adminData.full_name || "Administrator");
        console.log("[AuthContext] Role set: admin");
        return;
      }

      // Check teachers table
      const { data: teacherData, error: teacherError } = await supabase
        .from("teachers")
        .select("id, full_name")
        .eq("id", userId)
        .maybeSingle();

      console.log("[AuthContext] teachers result:", teacherData, "error:", teacherError);

      if (teacherData) {
        setRole("teacher");
        setUserName(teacherData.full_name || "Teacher");
        console.log("[AuthContext] Role set: teacher");
        return;
      }

      console.log("[AuthContext] No role found for user:", userId);
    } catch (err) {
      console.error("[AuthContext] fetchUserRole error:", err);
    }
  };

  useEffect(() => {
    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("[AuthContext] Auth event:", event, "user:", session?.user?.id);

        if (session?.user) {
          setUser(session.user);
          // setTimeout prevents Supabase client deadlock
          setTimeout(() => fetchUserRole(session.user.id), 100);
        } else {
          setUser(null);
          setRole(null);
          setUserName("");
          setIsLoading(false);
        }
      }
    );

    // Check existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("[AuthContext] Initial session:", session?.user?.id);
      if (session?.user) {
        setUser(session.user);
        fetchUserRole(session.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  };

  const signup = async (
    email: string,
    password: string,
    fullName: string,
    selectedRole: UserRole
  ) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };

    if (data.user) {
      if (selectedRole === "admin") {
        const { error: dbErr } = await supabase.from("profiles").upsert({
          id: data.user.id,
          full_name: fullName,
          role: "admin",
        });
        if (dbErr) console.error("[AuthContext] profiles upsert error:", dbErr);
      } else if (selectedRole === "teacher") {
        const { error: dbErr } = await supabase.from("teachers").upsert({
          id: data.user.id,
          full_name: fullName,
          email: email,
        });
        if (dbErr) console.error("[AuthContext] teachers upsert error:", dbErr);
      }
      setRole(selectedRole);
      setUserName(fullName);
    }
    return {};
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    setUserName("");
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn: !!user && !isLoading,
        isLoading,
        role,
        userName,
        user,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};