import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Save, Loader2, Award, BookOpen, Printer, X } from "lucide-react";
import { toast } from "sonner";

const TeacherResultsPage = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [examType, setExamType] = useState("Midterm Exam");
  const [totalMarks, setTotalMarks] = useState(100);
  const [marks, setMarks] = useState<Record<string, number>>({});
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const examTypes = ["First Term", "Midterm Exam", "Final Exam", "Monthly Test", "Quiz"];

  useEffect(() => {
    const fetchMyClasses = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: classData } = await supabase
          .from("classes")
          .select("id, name, grade_level, section")
          .eq("teacher_id", user.id)
          .order("grade_level", { ascending: true });

        setClasses(classData || []);
        if (classData && classData.length > 0) {
          setSelectedClass(classData[0].id);
        }
      } catch (error: any) {
        toast.error("Failed to load classes.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchMyClasses();
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    const fetchSubjects = async () => {
      const { data } = await supabase
        .from("subjects")
        .select("id, name")
        .eq("class_id", selectedClass);
      setSubjects(data || []);
      if (data && data.length > 0) setSelectedSubject(data[0].id);
    };
    fetchSubjects();
  }, [selectedClass]);

  useEffect(() => {
    if (!selectedClass || !selectedSubject) return;
    const fetchStudentsAndMarks = async () => {
      setIsLoading(true);
      try {
        const { data: studentData } = await supabase
          .from("students")
          .select("id, full_name, roll_number")
          .eq("class_id", selectedClass)
          .order("roll_number", { ascending: true });

        setStudents(studentData || []);

        const studentIds = studentData?.map(s => s.id) || [];
        if (studentIds.length > 0) {
          const { data: marksData } = await supabase
            .from("exam_marks")
            .select("student_id, marks_obtained, total_marks")
            .eq("class_id", selectedClass)
            .eq("subject_id", selectedSubject)
            .eq("exam_type", examType)
            .in("student_id", studentIds);

          const marksMap: Record<string, number> = {};
          marksData?.forEach(r => {
            marksMap[r.student_id] = r.marks_obtained;
            if (r.total_marks) setTotalMarks(r.total_marks);
          });
          setMarks(marksMap);
        }
      } catch (error: any) {
        toast.error("Failed to load students.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchStudentsAndMarks();
  }, [selectedClass, selectedSubject, examType]);

  const handleSaveMarks = async () => {
    if (students.length === 0) return toast.error("No students to grade.");
    setIsSaving(true);
    try {
      const records = students.map(s => ({
        student_id: s.id,
        class_id: selectedClass,
        subject_id: selectedSubject,
        exam_type: examType,
        marks_obtained: marks[s.id] || 0,
        total_marks: totalMarks
      }));

      const { error } = await supabase
        .from("exam_marks")
        .upsert(records, { onConflict: 'student_id, subject_id, exam_type' });

      if (error) throw error;
      toast.success("Results saved! ✅");
    } catch (error: any) {
      toast.error("Failed to save: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const generateReportCard = async (student: any) => {
    try {
      const { data: allMarks } = await supabase
        .from("exam_marks")
        .select("marks_obtained, total_marks, subjects(name)")
        .eq("student_id", student.id)
        .eq("exam_type", examType);

      if (!allMarks || allMarks.length === 0) return toast.error("No marks found yet.");

      const grandTotal = allMarks.reduce((s, m) => s + (m.total_marks || 100), 0);
      const obtained = allMarks.reduce((s, m) => s + (m.marks_obtained || 0), 0);
      const percentage = grandTotal > 0 ? ((obtained / grandTotal) * 100).toFixed(2) : "0";

      let grade = "F";
      if (Number(percentage) >= 80) grade = "A+";
      else if (Number(percentage) >= 70) grade = "A";
      else if (Number(percentage) >= 60) grade = "B";
      else if (Number(percentage) >= 50) grade = "C";
      else if (Number(percentage) >= 40) grade = "D";

      setReportData({ student, marksList: allMarks, grandTotal, obtainedTotal: obtained, percentage, grade });
    } catch {
      toast.error("Failed to generate report card.");
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-[#f8fafc] min-h-screen">

      {/* HEADER */}
      <div className="bg-gradient-to-br from-teal-900 via-cyan-900 to-slate-900 p-10 rounded-[2.5rem] text-white shadow-2xl border-b-4 border-teal-400">
        <h1 className="text-4xl font-black tracking-tight mb-2 flex items-center gap-3">
          <Award className="w-10 h-10 text-teal-400" /> Upload Results
        </h1>
        <p className="text-teal-100 font-medium text-lg">Enter and save exam marks for your students.</p>
      </div>

      {/* CONTROLS */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Class</label>
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-bold outline-none">
              {classes.length === 0 ? <option>No classes assigned</option> : null}
              {classes.map(c => <option key={c.id} value={c.id}>Grade {c.grade_level}{c.section} - {c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Subject</label>
            <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-bold outline-none">
              {subjects.length === 0 ? <option>No subjects found</option> : null}
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Exam Type</label>
            <select value={examType} onChange={e => setExamType(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-bold outline-none">
              {examTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-black text-teal-600 uppercase tracking-widest mb-2">Total Marks</label>
            <input type="number" value={totalMarks} onChange={e => setTotalMarks(Number(e.target.value))}
              className="w-full px-4 py-3 bg-teal-50 text-teal-900 rounded-xl text-sm font-black outline-none" />
          </div>
        </div>
        <button onClick={handleSaveMarks} disabled={isSaving}
          className="mt-4 bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 rounded-xl font-black flex items-center gap-2 transition-all">
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Save Results
        </button>
      </div>

      {/* MARKS ENTRY */}
      {isLoading ? (
        <div className="py-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-teal-500" /></div>
      ) : classes.length === 0 ? (
        <div className="bg-white p-12 rounded-[2rem] border-2 border-dashed border-slate-200 text-center">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-bold text-lg">No classes assigned to you yet.</p>
          <p className="text-slate-400 text-sm mt-1">Contact admin to get classes assigned.</p>
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white p-12 rounded-[2rem] border-2 border-dashed border-slate-200 text-center">
          <p className="text-slate-500 font-bold text-lg">No students in this class yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Award className="w-6 h-6 text-teal-500" /> Marks Entry Sheet
            </h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {students.map(student => {
              const obtained = marks[student.id] || 0;
              const isPass = obtained >= (totalMarks * 0.4);
              return (
                <div key={student.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center gap-4">
                  <div className="flex-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Roll: {student.roll_number}</span>
                    <p className="font-bold text-slate-800 text-sm">{student.full_name}</p>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div className={`h-full rounded-full ${isPass ? 'bg-emerald-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min((obtained / totalMarks) * 100, 100)}%` }} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <div className="flex items-center gap-2">
                      <input type="number" min="0" max={totalMarks}
                        value={marks[student.id] === undefined ? "" : marks[student.id]}
                        onChange={e => {
                          const val = Number(e.target.value);
                          if (val > totalMarks) return toast.error(`Max marks: ${totalMarks}`);
                          setMarks(prev => ({ ...prev, [student.id]: val }));
                        }}
                        className="w-16 text-center py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-black text-slate-800 outline-none" />
                      <span className="text-slate-400 font-bold text-xs">/ {totalMarks}</span>
                    </div>
                    <button onClick={() => generateReportCard(student)}
                      className="text-xs font-bold text-teal-600 bg-teal-50 hover:bg-teal-100 px-3 py-1 rounded-md flex items-center gap-1">
                      <Printer className="w-3 h-3" /> Result Card
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* REPORT CARD MODAL */}
      {reportData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white p-10 rounded-[2rem] max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-end gap-3 mb-6">
              <button onClick={() => window.print()}
                className="bg-teal-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2">
                <Printer className="w-4 h-4" /> Print
              </button>
              <button onClick={() => setReportData(null)}
                className="bg-slate-100 text-slate-600 p-2.5 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="border-4 border-double border-slate-800 p-8 rounded-2xl">
              <div className="text-center mb-8 border-b-2 border-slate-200 pb-6">
                <h1 className="text-4xl font-black text-slate-900 uppercase">EduFlow Academy</h1>
                <p className="text-slate-500 font-bold mt-1 uppercase">{examType} Report Card</p>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-8 bg-slate-50 p-4 rounded-xl">
                <div>
                  <span className="text-slate-400 font-bold text-xs uppercase block">Student Name</span>
                  <span className="text-lg font-black text-slate-800">{reportData.student.full_name}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 font-bold text-xs uppercase block">Roll Number</span>
                  <span className="text-lg font-black text-slate-800">{reportData.student.roll_number}</span>
                </div>
              </div>
              <table className="w-full text-left mb-8 border border-slate-200">
                <thead className="bg-slate-100 text-slate-600 text-xs uppercase font-black">
                  <tr>
                    <th className="p-3 border-b">Subject</th>
                    <th className="p-3 border-b text-center">Total</th>
                    <th className="p-3 border-b text-center">Obtained</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.marksList.map((m: any, idx: number) => (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="p-3 font-bold text-slate-700">{m.subjects?.name}</td>
                      <td className="p-3 text-center text-slate-500">{m.total_marks}</td>
                      <td className="p-3 text-center font-black text-slate-800">{m.marks_obtained}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="grid grid-cols-3 gap-4 text-center bg-teal-50 border border-teal-100 p-6 rounded-xl">
                <div>
                  <span className="text-teal-600 font-bold text-xs uppercase block">Total</span>
                  <span className="text-2xl font-black text-teal-900">{reportData.obtainedTotal} / {reportData.grandTotal}</span>
                </div>
                <div>
                  <span className="text-teal-600 font-bold text-xs uppercase block">Percentage</span>
                  <span className="text-2xl font-black text-teal-900">{reportData.percentage}%</span>
                </div>
                <div>
                  <span className="text-teal-600 font-bold text-xs uppercase block">Grade</span>
                  <span className="text-3xl font-black text-teal-900">{reportData.grade}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherResultsPage;