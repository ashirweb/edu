import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  GraduationCap, Search, Phone, 
  Users, BookOpen, Loader2, User
} from "lucide-react";
import { toast } from "sonner";

const MyStudentsPage = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchMyStudents = async () => {
    setIsLoading(true);
    try {
      // 1. Current Teacher ka pata lagayein
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user logged in");

      // 2. Is Teacher ko jo Classes mili hain, wo nikalen
      const { data: myClasses, error: classError } = await supabase
        .from("classes")
        .select("id")
        .eq("teacher_id", user.id);

      if (classError) throw classError;

      // Agar teacher ke paas koi class nahi hai
      if (!myClasses || myClasses.length === 0) {
        setStudents([]);
        setIsLoading(false);
        return;
      }

      const classIds = myClasses.map(c => c.id);

      // 3. Un Classes mein jo Bachay (Students) hain, sirf unko fetch karein!
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("*, classes(name, grade_level, section)")
        .in("class_id", classIds)
        .order("full_name", { ascending: true });

      if (studentError) throw studentError;
      
      setStudents(studentData || []);

    } catch (error: any) {
      toast.error("Failed to load your students.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyStudents();
  }, []);

  const filteredStudents = students.filter(s => 
    s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.roll_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.classes?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-[#f8fafc] min-h-screen">
      
      {/* 🚀 HEADER SECTION (Teacher Theme - Sky Blue) */}
      <div className="bg-gradient-to-br from-sky-900 via-blue-800 to-slate-900 p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 border-b-4 border-sky-400">
        <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <h1 className="text-4xl font-black tracking-tight mb-2 flex items-center gap-3">
            <Users className="w-10 h-10 text-sky-400" /> My Students
          </h1>
          <p className="text-sky-100 font-medium text-lg">
            View and manage students enrolled in your assigned classes.
          </p>
        </div>
        <div className="relative z-10 bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/20 text-center">
           <p className="text-3xl font-black text-white">{students.length}</p>
           <p className="text-xs font-bold text-sky-200 uppercase tracking-widest">Your Students</p>
        </div>
      </div>

      {/* 📋 SEARCH BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <h2 className="text-xl font-black text-slate-800 px-2 flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-sky-500" /> Class Roster
        </h2>
        <div className="relative w-full sm:w-96">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-sky-500"
            placeholder="Search your students by name or roll no..."
          />
        </div>
      </div>

      {/* 📋 STUDENTS GRID */}
      {isLoading ? (
        <div className="py-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-sky-500" /></div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white p-12 rounded-[2rem] border-2 border-dashed border-slate-200 text-center">
          <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-bold text-lg">No students found in your classes.</p>
          <p className="text-slate-400 text-sm mt-1">If this is a mistake, please contact the Administrator.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          {filteredStudents.map((student) => (
            <div key={student.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
              
              <div className="flex justify-between items-start mb-4 pr-2">
                <div className="w-14 h-14 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center font-black text-2xl group-hover:bg-sky-500 group-hover:text-white transition-colors">
                  {student.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="text-right">
                   <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                     Roll: {student.roll_number}
                   </span>
                </div>
              </div>
              
              <h3 className="text-xl font-black text-slate-800 mb-1 truncate">{student.full_name}</h3>
              
              <div className="pt-4 mt-4 border-t border-slate-100 flex flex-col gap-3">
                {student.classes && (
                  <div className="bg-sky-50/50 p-2 rounded-xl border border-sky-100 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-sky-500 shrink-0" /> 
                    <p className="text-sm font-bold text-sky-900 truncate">
                      Grade {student.classes.grade_level}{student.classes.section} - {student.classes.name}
                    </p>
                  </div>
                )}
                {student.guardian_phone && (
                  <p className="text-sm font-medium text-slate-500 flex items-center gap-2 truncate px-2">
                    <Phone className="w-4 h-4 text-slate-400" /> {student.guardian_phone}
                  </p>
                )}
              </div>
              
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyStudentsPage;