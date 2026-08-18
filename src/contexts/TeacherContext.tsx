import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface TeacherClass {
  id: string;
  name: string;
  grade_level: string;
  section: string;
  monthly_fee: number;
}

interface TeacherContextType {
  teacherProfile: any | null;
  assignedClasses: TeacherClass[];
  isLoading: boolean;
  refetch: () => void;
}

const TeacherContext = createContext<TeacherContextType | null>(null);

export const useTeacher = () => {
  const ctx = useContext(TeacherContext);
  if (!ctx) throw new Error("useTeacher must be used within TeacherProvider");
  return ctx;
};

export const TeacherProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [teacherProfile, setTeacherProfile] = useState<any | null>(null);
  const [assignedClasses, setAssignedClasses] = useState<TeacherClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTeacherData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // 1. Teacher profile fetch karo
      const { data: profile } = await supabase
        .from("teachers")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        setTeacherProfile(profile);

        // 2. Us teacher ki assigned classes fetch karo
        const { data: classes } = await supabase
          .from("classes")
          .select("id, name, grade_level, section, monthly_fee")
          .eq("teacher_id", user.id);

        if (classes) setAssignedClasses(classes);
      }
    } catch (err) {
      console.error("[TeacherContext] Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeacherData();
  }, [user]);

  return (
    <TeacherContext.Provider value={{
      teacherProfile,
      assignedClasses,
      isLoading,
      refetch: fetchTeacherData,
    }}>
      {children}
    </TeacherContext.Provider>
  );
};