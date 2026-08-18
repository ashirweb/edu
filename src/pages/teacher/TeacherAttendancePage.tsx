import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  CalendarDays, CheckCircle2, XCircle, 
  Clock, FileText, Save, Loader2, Users, Search 
} from "lucide-react";
import { toast } from "sonner";

// Attendance Status Types
type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Leave';

const TeacherAttendancePage = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  
  // Date picker state (defaults to today)
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // 1. Fetch Teacher's Assigned Classes
  const fetchMyClasses = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: classData, error: classError } = await supabase
        .from("classes")
        .select("id, name, grade_level, section")
        .eq("teacher_id", user.id)
        .order("grade_level", { ascending: true });

      if (classError) throw classError;
      
      setClasses(classData || []);
      if (classData && classData.length > 0) {
        setSelectedClass(classData[0].id); // Auto-select first class
      }
    } catch (error: any) {
      toast.error("Failed to load your classes.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyClasses();
  }, []);

  // 2. Fetch Students & Existing Attendance when Class or Date changes
  useEffect(() => {
    const fetchStudentsAndAttendance = async () => {
      if (!selectedClass) return;
      setIsLoading(true);
      
      try {
        // A. Fetch Students of this class
        const { data: studentData, error: studentError } = await supabase
          .from("students")
          .select("id, full_name, roll_number")
          .eq("class_id", selectedClass)
          .order("roll_number", { ascending: true });

        if (studentError) throw studentError;
        setStudents(studentData || []);

        // B. Fetch Existing Attendance for this date
        const studentIds = studentData?.map(s => s.id) || [];
        if (studentIds.length > 0) {
          const { data: attData, error: attError } = await supabase
            .from("attendance")
            .select("student_id, status")
            .eq("class_id", selectedClass)
            .eq("date", selectedDate)
            .in("student_id", studentIds);

          if (attError) throw attError;

          // Map existing attendance to state map: { "student_id": "status" }
          const attMap: Record<string, AttendanceStatus> = {};
          attData?.forEach(record => {
            attMap[record.student_id] = record.status as AttendanceStatus;
          });
          setAttendance(attMap);
        } else {
          setAttendance({});
        }

      } catch (error: any) {
        toast.error("Error loading student list.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudentsAndAttendance();
  }, [selectedClass, selectedDate]);

  // Handle individual status click
  const markStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  // 3. Save Attendance to Database
  const handleSaveAttendance = async () => {
    if (students.length === 0) return toast.error("No students to mark.");
    
    // Check if all students are marked
    const unmarked = students.filter(s => !attendance[s.id]);
    if (unmarked.length > 0) {
      const confirm = window.confirm(`${unmarked.length} students are unmarked. Save anyway? Unmarked will be saved as 'Absent'.`);
      if (!confirm) return;
    }

    setIsSaving(true);
    try {
      // Prepare array for Supabase upsert
      const attendanceRecords = students.map(student => ({
        student_id: student.id,
        class_id: selectedClass,
        date: selectedDate,
        status: attendance[student.id] || 'Absent', // Default unmarked to Absent
      }));

      // UPSERT: Insert if new, Update if already exists (Thanks to UNIQUE constraint in DB!)
      const { error } = await supabase
        .from("attendance")
        .upsert(attendanceRecords, { onConflict: 'student_id, date' });

      if (error) throw error;

      toast.success("Attendance saved successfully! 🎉");
    } catch (error: any) {
      toast.error("Failed to save attendance.");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.roll_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-[#f8fafc] min-h-screen">
      
      {/* 🚀 HEADER SECTION (Violet Theme) */}
      <div className="bg-gradient-to-br from-violet-900 via-purple-800 to-slate-900 p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 border-b-4 border-violet-400">
        <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <h1 className="text-4xl font-black tracking-tight mb-2 flex items-center gap-3">
            <CalendarDays className="w-10 h-10 text-violet-400" /> Daily Attendance
          </h1>
          <p className="text-violet-200 font-medium text-lg">
            Mark and manage daily attendance for your classes.
          </p>
        </div>
      </div>

      {/* 🎛️ CONTROLS BAR (Class & Date Selection) */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-6 items-end justify-between sticky top-4 z-20">
        
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          {/* Class Select */}
          <div className="w-full sm:w-64">
            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Select Class</label>
            <select 
              value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-violet-900 focus:ring-2 focus:ring-violet-500 outline-none appearance-none"
              disabled={isLoading || classes.length === 0}
            >
              {classes.length === 0 ? <option disabled>No classes assigned</option> : null}
              {classes.map(c => (
                <option key={c.id} value={c.id}>Grade {c.grade_level}{c.section} - {c.name}</option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div className="w-full sm:w-48">
            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Attendance Date</label>
            <input 
              type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]} // Can't mark future attendance
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-violet-500 outline-none"
            />
          </div>
        </div>

        {/* Save Button */}
        <button 
          onClick={handleSaveAttendance} disabled={isSaving || students.length === 0}
          className="w-full md:w-auto bg-violet-600 hover:bg-violet-700 text-white px-8 py-3.5 rounded-xl font-black shadow-lg shadow-violet-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Submit Register
        </button>
      </div>

      {/* 📋 ATTENDANCE LIST */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-violet-500" /> Student Register
          </h2>
          <div className="relative w-full sm:w-72">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Search student..."
            />
          </div>
        </div>

        {isLoading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-violet-500" /></div>
        ) : students.length === 0 ? (
          <div className="p-16 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-bold text-lg">No students found in this class.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-widest">
                  <th className="px-6 py-4 font-black">Roll No.</th>
                  <th className="px-6 py-4 font-black">Student Name</th>
                  <th className="px-6 py-4 font-black text-center">Mark Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student) => {
                  const status = attendance[student.id];
                  
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="bg-slate-100 text-slate-600 text-xs font-black px-3 py-1.5 rounded-lg border border-slate-200">
                          {student.roll_number}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800">{student.full_name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          
                          {/* PRESENT BUTTON */}
                          <button 
                            onClick={() => markStatus(student.id, 'Present')}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                              status === 'Present' ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500 ring-offset-1' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            <CheckCircle2 className="w-4 h-4" /> Present
                          </button>

                          {/* ABSENT BUTTON */}
                          <button 
                            onClick={() => markStatus(student.id, 'Absent')}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                              status === 'Absent' ? 'bg-red-100 text-red-700 ring-2 ring-red-500 ring-offset-1' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            <XCircle className="w-4 h-4" /> Absent
                          </button>

                          {/* LATE BUTTON */}
                          <button 
                            onClick={() => markStatus(student.id, 'Late')}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                              status === 'Late' ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-500 ring-offset-1' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            <Clock className="w-4 h-4" /> Late
                          </button>

                          {/* LEAVE BUTTON */}
                          <button 
                            onClick={() => markStatus(student.id, 'Leave')}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                              status === 'Leave' ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500 ring-offset-1' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            <FileText className="w-4 h-4" /> Leave
                          </button>

                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherAttendancePage;