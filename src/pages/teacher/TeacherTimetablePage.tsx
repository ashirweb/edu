import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CalendarDays, Clock, BookOpen, Loader2, Calendar } from "lucide-react";
import { toast } from "sonner";

const TeacherTimetablePage = () => {
  const [timetable, setTimetable] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [teacherName, setTeacherName] = useState("");

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  useEffect(() => {
    const fetchTimetable = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // ✅ Get teacher name
        const { data: teacher } = await supabase
          .from("teachers")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();

        if (teacher) setTeacherName(teacher.full_name);

        // ✅ Fetch timetable by teacher_name
        const { data: ttData } = await supabase
          .from("timetable")
          .select("*")
          .eq("teacher_name", teacher?.full_name || "")
          .order("start_time", { ascending: true });

        setTimetable(ttData || []);
      } catch (error: any) {
        toast.error("Failed to load timetable.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimetable();
  }, []);

  const formatTime = (timeStr: string) => {
    if (!timeStr) return "";
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedHour = h % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  };

  const getScheduleForDay = (day: string) => {
    return timetable.filter(t => t.day_of_week === day);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-[#f8fafc] min-h-screen">

      <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 border-b-4 border-indigo-400">
        <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <h1 className="text-4xl font-black tracking-tight mb-2 flex items-center gap-3">
            <CalendarDays className="w-10 h-10 text-indigo-400" /> My Timetable
          </h1>
          <p className="text-indigo-100 font-medium text-lg">Your weekly class schedule.</p>
        </div>
        <div className="relative z-10 bg-white/10 p-4 rounded-2xl border border-white/20 text-center">
          <p className="text-2xl font-black text-white">{timetable.length}</p>
          <p className="text-xs font-bold text-indigo-200 uppercase tracking-widest">Total Periods</p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-500" /></div>
      ) : timetable.length === 0 ? (
        <div className="bg-white p-12 rounded-[2rem] border-2 border-dashed border-slate-200 text-center">
          <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-bold text-lg">No timetable assigned yet.</p>
          <p className="text-slate-400 mt-1">Ask admin to add your schedule.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {daysOfWeek.map(day => {
            const daySchedule = getScheduleForDay(day);
            if (daySchedule.length === 0) return null;

            return (
              <div key={day} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="bg-indigo-50 p-4 border-b border-indigo-100 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-lg font-black text-indigo-900 uppercase tracking-wide">{day}</h3>
                </div>
                <div className="p-4 space-y-3">
                  {daySchedule.map((schedule, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-start gap-4 hover:border-indigo-200 transition-colors">
                      <div className="bg-indigo-100/50 p-2.5 rounded-xl text-indigo-600 shrink-0">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
                          {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                        </p>
                        <h4 className="font-bold text-slate-800 text-base flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4 text-indigo-400" />
                          {schedule.subject_name || "Subject"}
                        </h4>
                        <p className="text-xs text-slate-400 mt-1">{schedule.class_name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TeacherTimetablePage;