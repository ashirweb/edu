import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTeacher } from "../../contexts/TeacherContext";
import { Users, BookOpen, Bell, TrendingUp, Calendar, AlertCircle, Info, CheckCircle } from "lucide-react";

const TeacherDashboard = () => {
  const { teacherProfile, assignedClasses, isLoading } = useTeacher();
  const [totalStudents, setTotalStudents] = useState(0);
  const [notices, setNotices] = useState<any[]>([]);
  const [todayAttendance, setTodayAttendance] = useState({ present: 0, total: 0 });

  const today = new Date().toISOString().split("T")[0];
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };

  useEffect(() => {
    if (assignedClasses.length === 0) return;
    fetchStats();
  }, [assignedClasses]);

  const fetchStats = async () => {
    const classIds = assignedClasses.map(c => c.id);

    // Total students in assigned classes
    const { count } = await supabase
      .from("students")
      .select("id", { count: "exact" })
      .in("class_id", classIds);
    setTotalStudents(count || 0);

    // Today's attendance
    const { data: attData } = await supabase
      .from("attendance")
      .select("status")
      .eq("date", today)
      .in("student_id",
        (await supabase.from("students").select("id").in("class_id", classIds)).data?.map(s => s.id) || []
      );

    if (attData) {
      const present = attData.filter(a => a.status === "present").length;
      setTodayAttendance({ present, total: attData.length });
    }

    // Notices
    const { data: nData } = await supabase
      .from("notices")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);
    if (nData) setNotices(nData);
  };

  const priorityConfig = {
    critical: { color: "bg-red-50 border-red-200 text-red-700", icon: <AlertCircle className="w-4 h-4 text-red-500" />, badge: "bg-red-100 text-red-700" },
    high: { color: "bg-amber-50 border-amber-200 text-amber-700", icon: <AlertCircle className="w-4 h-4 text-amber-500" />, badge: "bg-amber-100 text-amber-700" },
    normal: { color: "bg-blue-50 border-blue-200 text-blue-700", icon: <Info className="w-4 h-4 text-blue-500" />, badge: "bg-blue-100 text-blue-700" },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-slate-50 min-h-screen">

      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 rounded-3xl p-8 text-white shadow-xl shadow-indigo-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <p className="text-indigo-200 text-sm font-medium mb-1">{greeting()},</p>
            <h1 className="text-3xl font-black">{teacherProfile?.full_name || "Teacher"} 👋</h1>
            <p className="text-indigo-300 mt-2 text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {new Date().toLocaleDateString("en-PK", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4 text-center min-w-[100px]">
              <p className="text-2xl font-black">{assignedClasses.length}</p>
              <p className="text-indigo-200 text-xs mt-1">Classes</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4 text-center min-w-[100px]">
              <p className="text-2xl font-black">{totalStudents}</p>
              <p className="text-indigo-200 text-xs mt-1">Students</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Assigned Classes", value: assignedClasses.length, icon: <BookOpen className="w-6 h-6" />, color: "bg-violet-50 text-violet-600", border: "border-violet-100" },
          { label: "Total Students", value: totalStudents, icon: <Users className="w-6 h-6" />, color: "bg-sky-50 text-sky-600", border: "border-sky-100" },
          { label: "Present Today", value: todayAttendance.present, icon: <CheckCircle className="w-6 h-6" />, color: "bg-emerald-50 text-emerald-600", border: "border-emerald-100" },
          { label: "Notices", value: notices.length, icon: <Bell className="w-6 h-6" />, color: "bg-amber-50 text-amber-600", border: "border-amber-100" },
        ].map((stat, i) => (
          <div key={i} className={`bg-white rounded-2xl p-5 border ${stat.border} shadow-sm`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
              {stat.icon}
            </div>
            <p className="text-2xl font-black text-slate-800">{stat.value}</p>
            <p className="text-slate-400 text-xs font-semibold mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* My Classes */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-50 flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <h2 className="font-black text-slate-800">My Assigned Classes</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {assignedClasses.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="font-medium">No classes assigned yet</p>
                <p className="text-xs mt-1">Contact admin to get classes assigned</p>
              </div>
            ) : (
              assignedClasses.map((cls, i) => (
                <div key={cls.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-black text-sm">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-black text-slate-800">{cls.name}</p>
                      <p className="text-xs text-slate-400">Grade {cls.grade_level} • Section {cls.section}</p>
                    </div>
                  </div>
                  <span className="bg-indigo-50 text-indigo-600 text-xs font-bold px-3 py-1 rounded-full">
                    Rs. {cls.monthly_fee}/mo
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Notices */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-50 flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <h2 className="font-black text-slate-800">School Notices</h2>
          </div>
          <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
            {notices.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="font-medium">No notices yet</p>
              </div>
            ) : (
              notices.map((n) => {
                const cfg = priorityConfig[n.priority as keyof typeof priorityConfig] || priorityConfig.normal;
                return (
                  <div key={n.id} className={`p-4 border-l-4 ${cfg.color} m-3 rounded-xl`}>
                    <div className="flex items-start gap-2">
                      {cfg.icon}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-black text-sm">{n.title}</p>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${cfg.badge}`}>
                            {n.priority}
                          </span>
                        </div>
                        <p className="text-xs opacity-80">{n.content}</p>
                        <p className="text-[10px] opacity-50 mt-1">
                          {new Date(n.created_at).toLocaleDateString("en-PK")}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;