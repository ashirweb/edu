import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CalendarDays, CheckCircle2, XCircle, AlertCircle, Loader2, Save, Search, Users } from "lucide-react";
import { toast } from "sonner";

const AdminAttendancePage = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Attendance State: { student_id: 'Present' | 'Absent' | 'Leave' }
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // 1. Fetch Classes on Load
  useEffect(() => {
    const fetchClasses = async () => {
      const { data } = await supabase.from("classes").select("*").order('grade_level');
      if (data) setClasses(data);
    };
    fetchClasses();
  }, []);

  // 2. Fetch Students & Existing Attendance when Class or Date changes
  useEffect(() => {
    const fetchAttendanceData = async () => {
      if (!selectedClass || !selectedDate) return;
      
      setIsLoading(true);
      try {
        // Fetch students of the selected class
        const { data: stuData, error: stuErr } = await supabase
          .from("students")
          .select("*")
          .eq("class_id", selectedClass)
          .order('full_name');
        
        if (stuErr) throw stuErr;
        setStudents(stuData || []);

        // Fetch already marked attendance for this date
        const { data: attData, error: attErr } = await supabase
          .from("attendance")
          .select("*")
          .eq("class_id", selectedClass)
          .eq("date", selectedDate);

        if (attErr) throw attErr;

        // Map existing attendance to state
        const initialAttendance: Record<string, string> = {};
        
        // Default everyone to 'Present' initially if no record exists
        (stuData || []).forEach(s => {
          initialAttendance[s.id] = 'Present'; 
        });

        // Override with actual DB records if they exist
        (attData || []).forEach(a => {
          initialAttendance[a.student_id] = a.status;
        });

        setAttendanceRecords(initialAttendance);

      } catch (error: any) {
        toast.error("Error loading data: " + error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttendanceData();
  }, [selectedClass, selectedDate]);

  // 3. Handle Status Change
  const handleStatusChange = (studentId: string, status: string) => {
    setAttendanceRecords(prev => ({ ...prev, [studentId]: status }));
  };

  // 4. Save to Database (BULLETPROOF METHOD)
  const handleSaveAttendance = async () => {
    if (students.length === 0) return toast.error("No students found in this class.");
    
    setIsSaving(true);
    try {
      // 🟢 PAYLOAD: Yahan Date aur Class_id dono shamil hain
      const payload = students.map(s => ({
        student_id: s.id,
        class_id: selectedClass,
        date: selectedDate, // 👈 Date save ho rahi hai!
        status: attendanceRecords[s.id] || 'Present' 
      }));

      // 🟢 STEP A: Purani attendance delete karein (Is se 'Upsert' ka masla nahi aayega)
      await supabase
        .from("attendance")
        .delete()
        .eq("class_id", selectedClass)
        .eq("date", selectedDate);

      // 🟢 STEP B: Nayi attendance Insert karein
      const { error } = await supabase
        .from("attendance")
        .insert(payload);

      if (error) throw error;
      toast.success(`Attendance completely saved for ${selectedDate}! ✅`);
      
    } catch (error: any) {
      toast.error("Failed to save: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.roll_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-[#fcfcfd] min-h-screen">
      
      {/* 🟢 HEADER */}
      <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center justify-between shadow-xl gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-4 rounded-3xl shadow-lg">
             <CalendarDays className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black italic">Daily Attendance</h1>
            <p className="text-indigo-400 font-bold text-[10px] tracking-widest uppercase mt-1">Admin Monitoring Register</p>
          </div>
        </div>
      </div>

      {/* 🟢 FILTERS SECTION */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50 flex flex-col md:flex-row gap-6 items-end">
        <div className="w-full md:w-1/3 space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Select Class</label>
          <select 
            className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="">-- Choose Class --</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="w-full md:w-1/3 space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Select Date</label>
          <input 
            type="date" 
            className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        <div className="w-full md:w-1/3">
          <button 
            onClick={handleSaveAttendance}
            disabled={isSaving || !selectedClass || students.length === 0}
            className="w-full p-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-slate-900 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Save Register</>}
          </button>
        </div>
      </div>

      {/* 🟢 ATTENDANCE REGISTER */}
      {selectedClass && (
        <div className="bg-white rounded-[3rem] shadow-xl overflow-hidden border border-white">
          <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search student..." 
                className="w-full p-3 pl-12 bg-white rounded-xl shadow-sm border-none font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* 🟢 DATE & TOTAL DISPLAY */}
            <div className="flex gap-2">
              <div className="text-[10px] font-black tracking-widest text-indigo-500 uppercase bg-indigo-50 px-4 py-2 rounded-xl shadow-sm">
                Date: {selectedDate}
              </div>
              <div className="text-[10px] font-black tracking-widest text-slate-400 uppercase bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
                Total: {filteredStudents.length} Students
              </div>
            </div>
          </div>

          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Roll No.</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student Name</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Mark Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr><td colSpan={3} className="p-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-indigo-500" /></td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={3} className="p-20 text-center text-slate-400 font-bold italic">No students found in this class.</td></tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-indigo-50/20 transition-all">
                    <td className="p-6 font-bold text-slate-500 uppercase text-xs">{s.roll_number}</td>
                    <td className="p-6">
                      <div className="font-black text-slate-800 text-lg flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600"><Users className="w-4 h-4" /></div>
                        {s.full_name}
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center justify-center gap-2 bg-slate-50 w-fit mx-auto p-1.5 rounded-2xl">
                        
                        {/* PRESENT BUTTON */}
                        <button 
                          onClick={() => handleStatusChange(s.id, 'Present')}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${attendanceRecords[s.id] === 'Present' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:bg-white'}`}
                        >
                          <CheckCircle2 className="w-4 h-4" /> Present
                        </button>

                        {/* ABSENT BUTTON */}
                        <button 
                          onClick={() => handleStatusChange(s.id, 'Absent')}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${attendanceRecords[s.id] === 'Absent' ? 'bg-red-500 text-white shadow-md' : 'text-slate-400 hover:bg-white'}`}
                        >
                          <XCircle className="w-4 h-4" /> Absent
                        </button>

                        {/* LEAVE BUTTON */}
                        <button 
                          onClick={() => handleStatusChange(s.id, 'Leave')}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${attendanceRecords[s.id] === 'Leave' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-400 hover:bg-white'}`}
                        >
                          <AlertCircle className="w-4 h-4" /> Leave
                        </button>

                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminAttendancePage;
