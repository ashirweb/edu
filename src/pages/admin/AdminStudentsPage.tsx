import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  GraduationCap, UserPlus, Phone, MapPin, Hash,
  Search, Trash2, Loader2, Users, BookOpen, Mail
} from "lucide-react";
import { toast } from "sonner";

const SUPABASE_URL = "https://hbkzzffesytwqmybyded.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhia3p6ZmZlc3l0d3FteWJ5ZGVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NTUwODksImV4cCI6MjA4OTEzMTA4OX0.XWfppjF6v-7OFUsNCESWUidAaLMrmyULBvN_1VZ_Ioo";

const AdminStudentsPage = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [fullName, setFullName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [email, setEmail] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [address, setAddress] = useState("");
  const [classId, setClassId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: classData, error: classError } = await supabase
        .from("classes")
        .select("id, name, grade_level, section")
        .order("grade_level", { ascending: true });

      if (classError) throw classError;
      setClasses(classData || []);

      if (classData && classData.length > 0 && !classId) {
        setClassId(classData[0].id);
      }

      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id, full_name, roll_number, email, guardian_phone, address, class_id, created_at")
        .order("created_at", { ascending: false });

      if (studentError) throw studentError;
      setStudents(studentData || []);

    } catch (error: any) {
      toast.error("Failed to load data: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const getClassName = (cid: string) => {
    const cls = classes.find(c => c.id === cid);
    return cls ? `Grade ${cls.grade_level}${cls.section} - ${cls.name}` : "Unassigned";
  };

  const getClassShort = (cid: string) => {
    const cls = classes.find(c => c.id === cid);
    return cls ? `Grade ${cls.grade_level}${cls.section}` : "Unassigned";
  };

  // ✅ REST API — schema cache bypass
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !rollNumber || !classId) {
      return toast.error("Name, Roll Number, and Class are required!");
    }

    setIsSubmitting(true);
    try {
      if (email) {
        const { data: existing } = await supabase
          .from("students")
          .select("id")
          .eq("email", email.toLowerCase().trim())
          .maybeSingle();

        if (existing) {
          toast.error("A student with this email already exists!");
          setIsSubmitting(false);
          return;
        }
      }

      const response = await fetch(`${SUPABASE_URL}/rest/v1/students`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },
        body: JSON.stringify({
          full_name: fullName,
          roll_number: rollNumber,
          email: email ? email.toLowerCase().trim() : null,
          guardian_phone: guardianPhone || null,
          address: address || null,
          class_id: classId
        })
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(err);
      }

      toast.success("Student enrolled successfully! ✅");
      setFullName("");
      setRollNumber("");
      setEmail("");
      setGuardianPhone("");
      setAddress("");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to enroll student.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name}?`)) return;
    try {
      const { error } = await supabase.from("students").delete().eq("id", id);
      if (error) throw error;
      toast.success(`${name} has been removed.`);
      fetchData();
    } catch (error: any) {
      toast.error("Failed to delete student.");
    }
  };

  const filteredStudents = students.filter(s =>
    s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.roll_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-[#f8fafc] min-h-screen">

      {/* HEADER */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900 p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 border-b-4 border-sky-400">
        <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <h1 className="text-4xl font-black tracking-tight mb-2 flex items-center gap-3">
            <Users className="w-10 h-10 text-sky-400" /> Student Admissions
          </h1>
          <p className="text-blue-100 font-medium text-lg">Enroll new students and manage records.</p>
          <p className="text-sky-300 text-sm mt-1 font-bold">
            💡 Students login using their registered email
          </p>
        </div>
        <div className="relative z-10 bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/20 text-center">
          <p className="text-3xl font-black text-white">{students.length}</p>
          <p className="text-xs font-bold text-blue-200 uppercase tracking-widest">Total Students</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ADMISSION FORM */}
        <div className="lg:col-span-1">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm sticky top-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <UserPlus className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black text-slate-800">New Admission</h2>
            </div>
            <p className="text-xs text-blue-500 font-bold mb-6 ml-1">
              Student will login using the email you enter here
            </p>

            <form onSubmit={handleAddStudent} className="space-y-4">

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Student Name *</label>
                <div className="relative">
                  <GraduationCap className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. Ali Khan" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Roll Number *</label>
                <div className="relative">
                  <Hash className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" required value={rollNumber} onChange={e => setRollNumber(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. ST-2026-001" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-blue-600 uppercase tracking-widest mb-2">Student Email (Login ID) *</label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-blue-50 border-none rounded-xl text-sm font-bold text-blue-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="student@gmail.com" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-blue-600 uppercase tracking-widest mb-2">Assign Class *</label>
                <div className="relative">
                  <BookOpen className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select value={classId} onChange={e => setClassId(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-blue-50 border-none rounded-xl text-sm font-bold text-blue-900 focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                    required>
                    <option value="" disabled>Select a Class...</option>
                    {classes.length === 0 ? (
                      <option disabled>No classes found. Create one first.</option>
                    ) : (
                      classes.map(c => (
                        <option key={c.id} value={c.id}>
                          Grade {c.grade_level}{c.section} - {c.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Guardian Phone</label>
                <div className="relative">
                  <Phone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={guardianPhone} onChange={e => setGuardianPhone(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0300-1234567" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Home Address</label>
                <div className="relative">
                  <MapPin className="w-5 h-5 absolute left-4 top-3 text-slate-400" />
                  <textarea value={address} onChange={e => setAddress(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24"
                    placeholder="House 123, Street 4..." />
                </div>
              </div>

              <button type="submit" disabled={isSubmitting || classes.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-black shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Enroll Student"}
              </button>
            </form>
          </div>
        </div>

        {/* STUDENTS LIST */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <h2 className="text-xl font-black text-slate-800 px-2">Student Directory</h2>
            <div className="relative w-full sm:w-72">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search name, roll # or email..." />
            </div>
          </div>

          {isLoading ? (
            <div className="py-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>
          ) : filteredStudents.length === 0 ? (
            <div className="bg-white p-12 rounded-[2rem] border-2 border-dashed border-slate-200 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-bold text-lg">No students found.</p>
              <p className="text-slate-400 text-sm mt-1">Fill the admission form to enroll a new student.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {filteredStudents.map(student => (
                <div key={student.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative">
                  <button onClick={() => handleDelete(student.id, student.full_name)}
                    className="absolute top-6 right-6 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>

                  <div className="flex justify-between items-start mb-4 pr-10">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-lg">
                      {student.full_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-blue-100">
                      {getClassShort(student.class_id)}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-slate-800 mb-1 truncate">{student.full_name}</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                    Roll: {student.roll_number}
                  </p>

                  <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                    <p className="text-sm font-medium text-slate-600 flex items-center gap-2 truncate">
                      <BookOpen className="w-4 h-4 text-blue-400" /> {getClassName(student.class_id)}
                    </p>
                    {student.email && (
                      <p className="text-sm font-bold text-blue-600 flex items-center gap-2 truncate">
                        <Mail className="w-4 h-4 shrink-0" /> {student.email}
                      </p>
                    )}
                    {student.guardian_phone && (
                      <p className="text-sm font-medium text-slate-500 flex items-center gap-2 truncate">
                        <Phone className="w-4 h-4 text-slate-400" /> {student.guardian_phone}
                      </p>
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

export default AdminStudentsPage;