import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Save, Loader2, Search, Award, ShieldCheck, Printer, X,
  CheckCircle2, AlertCircle, BookOpen, User, Calendar
} from "lucide-react";
import { toast } from "sonner";

const AdminResultsPage = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  
  // Selection States
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [examType, setExamType] = useState<string>("Midterm Exam");
  const [globalTotalMarks, setGlobalTotalMarks] = useState<number>(100);
  
  // Marks & UI State
  const [marks, setMarks] = useState<Record<string, number>>({});
  const [reportData, setReportData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const examTypes = ["First Term", "Midterm Exam", "Final Exam", "Monthly Test", "Quiz"];

  // 1. Initial Data Load
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const { data: classData } = await supabase
          .from("classes")
          .select("id, name, grade_level, section")
          .order("grade_level", { ascending: true });
        setClasses(classData || []);
        if (classData?.length) setSelectedClass(classData[0].id);

        const { data: subjectData } = await supabase
          .from("subjects")
          .select("id, name")
          .order("name", { ascending: true });
        setSubjects(subjectData || []);
        if (subjectData?.length) setSelectedSubject(subjectData[0].id);
      } catch (error) {
        toast.error("Initialization failed. Check your connection.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // 2. Fetch Students & Marks (With SAFE FALLBACK for 400 Error)
  useEffect(() => {
    const fetchStudentsAndMarks = async () => {
      if (!selectedClass || !selectedSubject) return;
      setIsLoading(true);
      try {
        // --- SAFE FALLBACK LOGIC ---
        let studentData = [];
        const { data: stuWithClasses, error: stuError } = await supabase
          .from("students")
          .select("id, full_name, roll_number, classes(name)")
          .eq("class_id", selectedClass)
          .order("roll_number", { ascending: true });

        if (stuError) {
          console.warn("Relationship error detected. Falling back to basic fetch...", stuError.message);
          // Fallback fetch without 'classes(name)' to avoid 400 Bad Request
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("students")
            .select("id, full_name, roll_number")
            .eq("class_id", selectedClass)
            .order("roll_number", { ascending: true });
            
          if (fallbackError) throw fallbackError;
          studentData = fallbackData || [];
        } else {
          studentData = stuWithClasses || [];
        }
        
        setStudents(studentData);

        const studentIds = studentData.map(s => s.id);
        if (studentIds.length > 0) {
          const { data: marksData, error: marksError } = await supabase
            .from("exam_marks")
            .select("student_id, marks_obtained, total_marks")
            .eq("class_id", selectedClass)
            .eq("subject_id", selectedSubject)
            .eq("exam_type", examType)
            .in("student_id", studentIds);
          
          if (marksError) throw marksError;

          const marksMap: Record<string, number> = {};
          marksData?.forEach(record => {
            marksMap[record.student_id] = record.marks_obtained;
            if (record.total_marks) setGlobalTotalMarks(record.total_marks);
          });
          setMarks(marksMap);
        } else {
          setMarks({});
        }
      } catch (error: any) {
        toast.error("Error retrieving records: " + error.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStudentsAndMarks();
  }, [selectedClass, selectedSubject, examType]);

  const handleMarkChange = (studentId: string, value: string) => {
    const numValue = value === "" ? 0 : Number(value);
    if (numValue > globalTotalMarks) {
      toast.warning(`Limit exceeded: Max marks are ${globalTotalMarks}`);
      return;
    }
    setMarks(prev => ({ ...prev, [studentId]: numValue }));
  };

  const handleSaveMarks = async () => {
    if (!students.length) return toast.error("No students found in this class.");
    setIsSaving(true);
    try {
      const marksRecords = students.map(student => ({
        student_id: student.id, 
        class_id: selectedClass, 
        subject_id: selectedSubject,
        exam_type: examType, 
        marks_obtained: marks[student.id] || 0, 
        total_marks: globalTotalMarks
      }));

      const { error } = await supabase
        .from("exam_marks")
        .upsert(marksRecords, { onConflict: 'student_id, subject_id, exam_type' });

      if (error) throw error;
      toast.success("Examination results synchronized successfully!", { icon: "🛡️" });
    } catch (error: any) {
      toast.error("Failed to save results: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const previewReportCard = async (student: any) => {
    try {
      // Safe fallback for subject names if relation is missing
      let allMarks = [];
      const { data: marksWithSubjects, error: marksError } = await supabase
        .from("exam_marks")
        .select("marks_obtained, total_marks, subjects(name)")
        .eq("student_id", student.id)
        .eq("exam_type", examType);

      if (marksError) {
        console.warn("Subject relation missing, falling back...");
        const { data: marksFallback } = await supabase
          .from("exam_marks")
          .select("marks_obtained, total_marks, subject_id")
          .eq("student_id", student.id)
          .eq("exam_type", examType);
          
        // Map subject names manually if relation fails
        allMarks = (marksFallback || []).map(m => ({
          ...m,
          subjects: { name: subjects.find(s => s.id === m.subject_id)?.name || "Unknown Subject" }
        }));
      } else {
        allMarks = marksWithSubjects || [];
      }

      if (!allMarks.length) return toast.info("No results compiled for this student yet.");

      const obtainedTotal = allMarks.reduce((acc: number, m: any) => acc + (m.marks_obtained || 0), 0);
      const grandTotal = allMarks.reduce((acc: number, m: any) => acc + (m.total_marks || 100), 0);
      const percentage = Number(((obtainedTotal / grandTotal) * 100).toFixed(1));
      
      let grade = "F";
      if (percentage >= 80) grade = "A+";
      else if (percentage >= 70) grade = "A";
      else if (percentage >= 60) grade = "B";
      else if (percentage >= 50) grade = "C";
      else if (percentage >= 40) grade = "D";

      setReportData({ student, marksList: allMarks, grandTotal, obtainedTotal, percentage, grade });
    } catch (err) {
      toast.error("Failed to generate report card.");
    }
  };

  // 🖨️ Clean PDF/Print Document Generator
  const printDocument = () => {
    if (!reportData) return;
    
    const win = window.open('', '_blank');
    if (!win) return;
    
    const rowsHtml = reportData.marksList.map((m: any) => `
      <tr>
        <td style="padding: 14px; border-bottom: 1px solid #e2e8f0; color: #334155; font-weight: 600;">${m.subjects?.name || 'Subject'}</td>
        <td style="padding: 14px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #64748b;">${m.total_marks}</td>
        <td style="padding: 14px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #0f172a; font-weight: 800;">${m.marks_obtained}</td>
      </tr>
    `).join('');

    win.document.write(`
      <html>
        <head>
          <title>Report Card - ${reportData.student.full_name}</title>
          <style>
            body { font-family: 'Inter', system-ui, sans-serif; padding: 40px; color: #0f172a; }
            .report-box { border: 4px double #1e293b; padding: 50px; max-width: 800px; margin: auto; border-radius: 16px; }
            .header { text-align: center; margin-bottom: 40px; }
            .school-name { font-size: 32px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: 1px; color: #1e293b; }
            .exam-type { color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 3px; font-weight: bold; margin-top: 8px; }
            .divider { height: 2px; background: #e2e8f0; margin: 20px auto; width: 100px; }
            
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; padding: 20px; background: #f8fafc; border-radius: 8px; border: 1px solid #f1f5f9; }
            .info-group { margin-bottom: 5px; }
            .info-label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold; letter-spacing: 1px; display: block; margin-bottom: 4px; }
            .info-value { font-size: 16px; font-weight: 800; color: #0f172a; text-transform: capitalize; }
            
            table { w-full: 100%; width: 100%; border-collapse: collapse; margin-bottom: 40px; }
            th { padding: 14px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 800; border-bottom: 2px solid #1e293b; }
            th.center { text-align: center; }
            th.right { text-align: right; }
            
            .summary { display: flex; justify-content: space-between; background: #f8fafc; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 60px; }
            .summary-box { text-align: center; }
            .summary-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; letter-spacing: 1px; margin-bottom: 8px; display: block; }
            .summary-val { font-size: 28px; font-weight: 900; color: #0f172a; }
            
            .signatures { display: flex; justify-content: space-between; padding: 0 20px; margin-top: 80px; }
            .sig-line { width: 200px; border-top: 1px solid #cbd5e1; text-align: center; padding-top: 10px; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
          </style>
        </head>
        <body>
          <div class="report-box">
            <div class="header">
              <h1 class="school-name">EduFlow Academy</h1>
              <div class="divider"></div>
              <div class="exam-type">${examType} Statement of Results</div>
            </div>
            
            <div class="info-grid">
              <div class="info-group">
                <span class="info-label">Student Name</span>
                <span class="info-value">${reportData.student.full_name}</span>
              </div>
              <div class="info-group" style="text-align: right;">
                <span class="info-label">Roll Number</span>
                <span class="info-value">${reportData.student.roll_number}</span>
              </div>
              <div class="info-group">
                <span class="info-label">Class / Grade</span>
                <span class="info-value">${reportData.student.classes?.name || 'Class Assigned'}</span>
              </div>
              <div class="info-group" style="text-align: right;">
                <span class="info-label">Date Issued</span>
                <span class="info-value">${new Date().toLocaleDateString('en-GB')}</span>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Subject Description</th>
                  <th class="center">Total Marks</th>
                  <th class="right">Marks Obtained</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <div class="summary">
              <div class="summary-box">
                <span class="summary-label">Total Score</span>
                <span class="summary-val">${reportData.obtainedTotal} <span style="font-size: 16px; color: #64748b;">/ ${reportData.grandTotal}</span></span>
              </div>
              <div class="summary-box">
                <span class="summary-label">Percentage</span>
                <span class="summary-val">${reportData.percentage}%</span>
              </div>
              <div class="summary-box">
                <span class="summary-label">Final Grade</span>
                <span class="summary-val" style="color: #4f46e5;">${reportData.grade}</span>
              </div>
            </div>

            <div class="signatures">
              <div class="sig-line">Class Supervisor</div>
              <div class="sig-line">Principal / Administrator</div>
            </div>
          </div>
          <script>
            setTimeout(() => { window.print(); }, 500);
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const filteredStudents = students.filter(s => 
    s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.roll_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6 bg-slate-50/50 min-h-screen font-sans">
      
      {/* PROFESSIONAL HEADER */}
      <header className="bg-white border border-slate-200 p-8 rounded-[2rem] shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 print:hidden">
        <div className="flex items-center gap-5">
          <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
             <ShieldCheck className="w-8 h-8 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Academic Results</h1>
            <p className="text-slate-500 font-medium mt-1 text-sm md:text-base">Centralized control for examination records and report generation.</p>
          </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={handleSaveMarks} 
            disabled={isSaving} 
            className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-xl font-bold shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Sync Data
          </button>
        </div>
      </header>

      {/* FILTER PANEL */}
      <section className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 items-end print:hidden">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Academic Class</label>
          <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none">
            {classes.map(c => <option key={c.id} value={c.id}>Grade {c.grade_level}{c.section}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Subject</label>
          <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none">
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Examination Term</label>
          <select value={examType} onChange={(e) => setExamType(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none">
            {examTypes.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Total Max Marks</label>
          <input type="number" value={globalTotalMarks} onChange={(e) => setGlobalTotalMarks(Number(e.target.value))} className="w-full px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-xl text-sm font-black text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500/20" />
        </div>
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input 
            placeholder="Search by name or roll no..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all shadow-sm"
          />
        </div>
      </section>

      {/* STUDENT GRADING LIST */}
      <main className="print:hidden">
        {isLoading ? (
          <div className="h-64 bg-white rounded-[2rem] border border-slate-200 flex flex-col items-center justify-center gap-4 text-slate-400 shadow-sm">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
            <p className="font-bold tracking-wide">Syncing academic records...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
           <div className="h-64 bg-white rounded-[2rem] border border-slate-200 flex flex-col items-center justify-center gap-3 text-slate-400 shadow-sm">
             <User className="w-12 h-12 text-slate-300" />
             <p className="font-bold tracking-wide text-slate-500">No students found for this selection.</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
            {filteredStudents.map((student) => {
              const obtained = marks[student.id] || 0;
              const percentage = (obtained / globalTotalMarks) * 100;
              const isPass = percentage >= 40;

              return (
                <div key={student.id} className="bg-white rounded-[1.5rem] p-6 border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start mb-5">
                    <div className="h-10 px-3 rounded-lg bg-slate-100 flex items-center justify-center font-black text-slate-600 text-xs tracking-wider border border-slate-200">
                      Roll #{student.roll_number}
                    </div>
                    <button 
                      onClick={() => previewReportCard(student)} 
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 border border-indigo-100 shadow-sm"
                      title="Preview Report Card"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="font-extrabold text-slate-800 line-clamp-1 mb-1.5 text-lg">{student.full_name}</h3>
                  <div className="flex items-center gap-2 mb-5">
                    {isPass ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-rose-500" />}
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isPass ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isPass ? 'Passing Score' : 'Needs Review'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
                    <input 
                      type="number" 
                      value={marks[student.id] ?? ""} 
                      onChange={(e) => handleMarkChange(student.id, e.target.value)} 
                      className="w-full bg-transparent text-xl font-black text-slate-900 outline-none focus:text-indigo-700"
                      placeholder="0"
                    />
                    <div className="h-8 w-[1px] bg-slate-300" />
                    <span className="text-slate-400 font-black text-sm whitespace-nowrap px-2">/ {globalTotalMarks}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* REPORT CARD MODAL PREVIEW */}
      {reportData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 print:hidden">
          <div className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 border border-slate-200">
            {/* Modal Toolbar */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <span className="font-bold text-slate-600 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-500"/>
                Result Preview
              </span>
              <button onClick={() => setReportData(null)} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200 transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* QUICK PREVIEW CONTENT */}
            <div className="p-8">
              <div className="text-center mb-6">
                <h3 className="text-xl font-black text-slate-900 uppercase">{reportData.student.full_name}</h3>
                <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">{examType}</p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-6 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase">Roll Number</span>
                  <span className="font-black text-slate-800">{reportData.student.roll_number}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase">Class</span>
                  <span className="font-bold text-slate-700">{reportData.student.classes?.name || 'Assigned Class'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase">Total Subjects</span>
                  <span className="font-black text-indigo-600">{reportData.marksList.length}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-8">
                <div className="bg-indigo-50 rounded-xl p-3 text-center border border-indigo-100">
                  <span className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Score</span>
                  <span className="text-lg font-black text-indigo-900">{reportData.obtainedTotal}</span>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
                  <span className="block text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1">Percent</span>
                  <span className="text-lg font-black text-emerald-900">{reportData.percentage}%</span>
                </div>
                <div className="bg-slate-900 rounded-xl p-3 text-center border border-slate-800">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Grade</span>
                  <span className="text-xl font-black text-white">{reportData.grade}</span>
                </div>
              </div>

              <button 
                onClick={printDocument} 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold flex justify-center items-center gap-2 shadow-md shadow-indigo-500/30 transition-all active:scale-[0.98]"
              >
                <Printer className="w-5 h-5" /> Download PDF / Print Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminResultsPage;