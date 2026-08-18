import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  GraduationCap, Users, Banknote, Trash2,
  Search, BookOpen, Loader2, PlusCircle, BookA
} from "lucide-react";
import { toast } from "sonner";

const AdminClassesPage = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [className, setClassName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [section, setSection] = useState("A");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // ✅ Fetch classes WITHOUT join
      const { data: classData, error: classError } = await supabase
        .from("classes")
        .select("id, name, grade_level, section, monthly_fee, teacher_id")
        .order("grade_level", { ascending: true });

      if (classError) throw classError;
      setClasses(classData || []);

      // ✅ Fetch teachers separately
      const { data: teacherData, error: teacherError } = await supabase
        .from("teachers")
        .select("id, full_name")
        .order("full_name", { ascending: true });

      if (teacherError) throw teacherError;
      setTeachers(teacherData || []);

      if (teacherData && teacherData.length > 0 && !teacherId) {
        setTeacherId(teacherData[0].id);
      }

    } catch (error: any) {
      toast.error("Failed to load data.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ✅ Helper to get teacher name from teacher_id
  const getTeacherName = (tid: string) => {
    const teacher = teachers.find(t => t.id === tid);
    return teacher ? teacher.full_name : "No Teacher Assigned";
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className || !gradeLevel) return toast.error("Class Name and Grade Level are required!");

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("classes").insert([{
        name: className,
        grade_level: parseInt(gradeLevel),
        section: section,
        monthly_fee: monthlyFee ? parseFloat(monthlyFee) : 0,
        teacher_id: teacherId || null
      }]);

      if (error) throw error;

      toast.success("Class created successfully! ✅");
      setClassName("");
      setGradeLevel("");
      setSection("A");
      setMonthlyFee("");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to create class.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete ${name}? This will affect students in this class.`)) return;
    try {
      const { error } = await supabase.from("classes").delete().eq("id", id);
      if (error) throw error;
      toast.success(`${name} deleted.`);
      fetchData();
    } catch (error: any) {
      toast.error("Failed to delete class.");
    }
  };

  const filteredClasses = classes.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getTeacherName(c.teacher_id)?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-[#f8fafc] min-h-screen">

      {/* HEADER */}
      <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-slate-900 p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 border-b-4 border-amber-400">
        <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <h1 className="text-4xl font-black tracking-tight mb-2 flex items-center gap-3">
            <GraduationCap className="w-10 h-10 text-amber-400" /> Academic Classes
          </h1>
          <p className="text-emerald-100 font-medium text-lg">Create classes and assign class teachers.</p>
        </div>
        <div className="relative z-10 bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/20 text-center">
          <p className="text-3xl font-black text-white">{classes.length}</p>
          <p className="text-xs font-bold text-emerald-200 uppercase tracking-widest">Active Classes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* CREATE CLASS FORM */}
        <div className="lg:col-span-1">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm sticky top-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <PlusCircle className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black text-slate-800">Create Class</h2>
            </div>

            <form onSubmit={handleAddClass} className="space-y-5">

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Class Name *</label>
                <div className="relative">
                  <BookA className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" required value={className} onChange={e => setClassName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="e.g. Mathematics Core" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Grade *</label>
                  {/* Yahan par max limit 16 set kardi hai */}
                  <input type="number" required min="1" max="16" value={gradeLevel} onChange={e => setGradeLevel(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="e.g. 10" />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Section *</label>
                  <input type="text" required maxLength={1} value={section} onChange={e => setSection(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none uppercase"
                    placeholder="A" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Monthly Fee (Rs)</label>
                <div className="relative">
                  <Banknote className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="number" min="0" value={monthlyFee} onChange={e => setMonthlyFee(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="5000" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-emerald-600 uppercase tracking-widest mb-2">Assign Teacher</label>
                <div className="relative">
                  <Users className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select value={teacherId} onChange={e => setTeacherId(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-emerald-50 border-none rounded-xl text-sm font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none">
                    <option value="" disabled>Select a Teacher...</option>
                    {teachers.length === 0 ? (
                      <option disabled>No teachers found. Add teachers first.</option>
                    ) : (
                      teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.full_name}</option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button type="submit" disabled={isSubmitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-black shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create & Assign"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* CLASSES LIST */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <h2 className="text-xl font-black text-slate-800 px-2">All Classes</h2>
            <div className="relative w-full sm:w-72">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Search class or teacher..." />
            </div>
          </div>

          {isLoading ? (
            <div className="py-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-emerald-500" /></div>
          ) : filteredClasses.length === 0 ? (
            <div className="bg-white p-12 rounded-[2rem] border-2 border-dashed border-slate-200 text-center">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-bold text-lg">No classes found.</p>
              <p className="text-slate-400 text-sm mt-1">Create your first class from the panel.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {filteredClasses.map(cls => (
                <div key={cls.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative">
                  <button onClick={() => handleDelete(cls.id, cls.name)}
                    className="absolute top-6 right-6 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>

                  <div className="flex justify-between items-start mb-4 pr-10">
                    <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                      Grade {cls.grade_level}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-slate-800 mb-1">{cls.name}</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Section {cls.section}</p>

                  <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
                    <p className="text-sm font-bold text-emerald-600 flex items-center gap-2">
                      <Users className="w-4 h-4" /> {getTeacherName(cls.teacher_id)}
                    </p>
                    <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-slate-400" /> Rs {cls.monthly_fee} / month
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminClassesPage;