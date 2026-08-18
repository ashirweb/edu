import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  BookMarked, Library, Hash, PlusCircle, 
  Trash2, Search, Loader2, BookOpen 
} from "lucide-react";
import { toast } from "sonner";

const AdminSubjectsPage = () => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // 1. Fetch Subjects from Database
  const fetchSubjects = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setSubjects(data || []);
    } catch (error: any) {
      toast.error("Failed to load subjects.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  // 2. Add New Subject
  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName) return toast.error("Subject Name is required!");

    setIsSubmitting(true);
    try {
      // Check if subject already exists
      const { data: existing } = await supabase
        .from("subjects")
        .select("id")
        .ilike("name", subjectName)
        .single();

      if (existing) {
        toast.error("This subject already exists in the system!");
        setIsSubmitting(false);
        return;
      }

      // Insert new subject
      const { error } = await supabase.from("subjects").insert([
        { 
          name: subjectName, 
          code: subjectCode.toUpperCase() || null 
        }
      ]);

      if (error) throw error;

      toast.success(`${subjectName} added successfully! 📚`);
      setSubjectName("");
      setSubjectCode("");
      fetchSubjects(); // Refresh list
    } catch (error: any) {
      toast.error(error.message || "Failed to add subject.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Delete Subject
  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name}? This may affect existing exam results linked to this subject.`)) return;

    try {
      const { error } = await supabase.from("subjects").delete().eq("id", id);
      if (error) throw error;
      
      toast.success(`${name} has been deleted.`);
      fetchSubjects();
    } catch (error: any) {
      toast.error("Failed to delete subject.");
    }
  };

  // Search Filter
  const filteredSubjects = subjects.filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-[#f8fafc] min-h-screen">
      
      {/* 🚀 HEADER SECTION (Amber/Orange Theme) */}
      <div className="bg-gradient-to-br from-amber-900 via-orange-800 to-slate-900 p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 border-b-4 border-amber-400">
        <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <h1 className="text-4xl font-black tracking-tight mb-2 flex items-center gap-3">
            <Library className="w-10 h-10 text-amber-400" /> Course Catalog
          </h1>
          <p className="text-amber-100 font-medium text-lg">
            Manage academic subjects and curriculum codes.
          </p>
        </div>
        <div className="relative z-10 bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/20 text-center min-w-[120px]">
           <p className="text-3xl font-black text-white">{subjects.length}</p>
           <p className="text-xs font-bold text-amber-200 uppercase tracking-widest">Total Subjects</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 📝 ADD NEW SUBJECT FORM */}
        <div className="lg:col-span-1">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm sticky top-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <PlusCircle className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black text-slate-800">Add Subject</h2>
            </div>

            <form onSubmit={handleAddSubject} className="space-y-5">
              
              {/* Subject Name */}
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Subject Name</label>
                <div className="relative">
                  <BookOpen className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" required value={subjectName} onChange={(e) => setSubjectName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none" 
                    placeholder="e.g. Mathematics"
                  />
                </div>
              </div>

              {/* Subject Code */}
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Subject Code <span className="text-slate-400 font-normal">(Optional)</span></label>
                <div className="relative">
                  <Hash className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none uppercase" 
                    placeholder="e.g. MATH-101"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit" disabled={isSubmitting}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white py-4 rounded-xl font-black shadow-lg shadow-amber-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Subject"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* 📋 SUBJECTS DIRECTORY */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <h2 className="text-xl font-black text-slate-800 px-2">All Subjects</h2>
            <div className="relative w-full sm:w-72">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="Search subjects..."
              />
            </div>
          </div>

          {isLoading ? (
            <div className="py-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-amber-500" /></div>
          ) : filteredSubjects.length === 0 ? (
            <div className="bg-white p-12 rounded-[2rem] border-2 border-dashed border-slate-200 text-center">
              <BookMarked className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-bold text-lg">No subjects found.</p>
              <p className="text-slate-400 text-sm mt-1">Add a new subject from the panel to get started.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {filteredSubjects.map((subject) => (
                <div key={subject.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow group relative flex items-center gap-4">
                  <button 
                    onClick={() => handleDelete(subject.id, subject.name)}
                    className="absolute top-1/2 -translate-y-1/2 right-6 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    title="Delete Subject"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  
                  <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
                    <BookMarked className="w-7 h-7" />
                  </div>
                  
                  <div className="pr-10">
                    <h3 className="text-lg font-black text-slate-800 truncate">{subject.name}</h3>
                    {subject.code && (
                      <span className="inline-block mt-1 bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest border border-slate-200">
                        {subject.code}
                      </span>
                    )}
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

export default AdminSubjectsPage;