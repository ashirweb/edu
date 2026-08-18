import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  UserPlus, Mail, Phone, User, Trash2,
  Search, Loader2, ShieldCheck, GraduationCap,
  Wallet, CheckCircle2, AlertCircle, BookOpen,
  Calendar, Award, TrendingUp, KeyRound
} from "lucide-react";
import { toast } from "sonner";

const AdminTeachersPage = () => {
  const [activeTab, setActiveTab] = useState<"teachers" | "salary">("teachers");
  const [teachers, setTeachers] = useState<any[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Form States
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [degree, setDegree] = useState("");
  const [subjectSpecialty, setSubjectSpecialty] = useState("");
  const [monthlySalary, setMonthlySalary] = useState("");
  const [joiningDate, setJoiningDate] = useState("");

  // Salary States
  const [salaryTeacherId, setSalaryTeacherId] = useState("");
  const [salaryAmount, setSalaryAmount] = useState("");
  const [salaryMonth, setSalaryMonth] = useState(
    new Date().toLocaleString("default", { month: "long" })
  );
  const [salaryYear, setSalaryYear] = useState(
    new Date().getFullYear().toString()
  );

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const currentMonth = new Date().toLocaleString("default", { month: "long" });
  const currentYear = new Date().getFullYear().toString();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: teacherData, error: tError } = await supabase
        .from("teachers")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (tError) throw tError;
      setTeachers(teacherData || []);

      const { data: salaryData, error: sError } = await supabase
        .from("teacher_salaries")
        .select("*")
        .order("created_at", { ascending: false });
        
      if (sError) throw sError;
      setSalaryRecords(salaryData || []);
    } catch (error: any) {
      toast.error("Failed to load data from database.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const paidTeacherIds = salaryRecords
    .filter(s => s.month === currentMonth && s.year === currentYear)
    .map(s => s.teacher_id);

  const unpaidTeachers = teachers.filter(t => !paidTeacherIds.includes(t.id));
  const totalMonthlySalary = teachers.reduce((sum, t) => sum + (t.salary || 0), 0);
  const totalPaidThisMonth = salaryRecords
    .filter(s => s.month === currentMonth && s.year === currentYear)
    .reduce((sum, s) => sum + (s.amount_paid || 0), 0);

  const handleTeacherSelect = (teacherId: string) => {
    setSalaryTeacherId(teacherId);
    const teacher = teachers.find(t => t.id === teacherId);
    if (teacher?.salary) setSalaryAmount(teacher.salary.toString());
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email) return toast.error("Name and Email are required!");

    setIsSubmitting(true);
    try {
      const cleanEmail = email.toLowerCase().trim();

      // Check if email already exists
      const { data: existing } = await supabase
        .from("teachers")
        .select("id")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (existing) {
        toast.error("A teacher with this email already exists!");
        setIsSubmitting(false);
        return;
      }

      // Safe database insert using Supabase Client
      const { error } = await supabase.from("teachers").insert([{
        full_name: fullName,
        email: cleanEmail,
        phone: phone || null,
        degree: degree || null,
        subject_specialty: subjectSpecialty || null,
        salary: monthlySalary ? parseFloat(monthlySalary) : 0,
        joining_date: joiningDate || null,
      }]);

      if (error) throw error;

      toast.success(`${fullName} registered successfully! ✅`, {
        description: `They can now access the portal using ${cleanEmail}`
      });
      
      // Reset Form
      setFullName(""); setEmail(""); setPhone("");
      setDegree(""); setSubjectSpecialty("");
      setMonthlySalary(""); setJoiningDate("");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to add teacher.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaySalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salaryTeacherId || !salaryAmount) {
      return toast.error("Select teacher and enter amount!");
    }

    setIsSubmitting(true);
    try {
      const teacher = teachers.find(t => t.id === salaryTeacherId);
      const alreadyPaid = salaryRecords.some(
        s => s.teacher_id === salaryTeacherId &&
          s.month === salaryMonth &&
          s.year === salaryYear
      );

      if (alreadyPaid) {
        if (!window.confirm(`${teacher?.full_name} already paid for ${salaryMonth}. Add duplicate record?`)) {
          setIsSubmitting(false);
          return;
        }
      }

      const { error } = await supabase.from("teacher_salaries").insert([{
        teacher_id: salaryTeacherId,
        teacher_name: teacher?.full_name || "Unknown",
        amount_paid: parseFloat(salaryAmount),
        month: salaryMonth,
        year: salaryYear,
        status: "Paid"
      }]);

      if (error) throw error;

      toast.success("Salary recorded successfully! 💰");
      setSalaryTeacherId("");
      setSalaryAmount("");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to record salary.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTeacher = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name}?\nThey will lose portal access.`)) return;
    try {
      const { error } = await supabase.from("teachers").delete().eq("id", id);
      if (error) throw error;
      toast.success(`${name} has been removed.`);
      fetchData();
    } catch {
      toast.error("Failed to delete teacher. They might be assigned to classes.");
    }
  };

  const handleDeleteSalary = async (id: string) => {
    if (!window.confirm("Delete this salary record?")) return;
    try {
      const { error } = await supabase.from("teacher_salaries").delete().eq("id", id);
      if (error) throw error;
      toast.success("Salary record deleted.");
      fetchData();
    } catch {
      toast.error("Failed to delete record.");
    }
  };

  const filteredTeachers = teachers.filter(t =>
    t.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.subject_specialty?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 bg-[#f8fafc] min-h-screen font-sans">

      {/* HEADER */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-8 md:p-10 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden border-b-4 border-indigo-400">
        <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="relative z-10 w-full md:w-auto text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2 flex items-center justify-center md:justify-start gap-3">
              <BookOpen className="w-8 h-8 md:w-10 md:h-10 text-indigo-400" /> Faculty Management
            </h1>
            <p className="text-slate-300 font-medium text-sm md:text-lg">Manage teachers, portal access & salaries.</p>
            <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-400/30 px-4 py-2 rounded-xl mt-4">
              <KeyRound className="w-4 h-4 text-indigo-300" />
              <p className="text-indigo-200 text-xs font-bold">Teachers use their registered email to log in.</p>
            </div>
          </div>
          <div className="relative z-10 flex gap-3 w-full md:w-auto justify-center">
            <div className="bg-white/10 p-3 md:p-4 rounded-2xl border border-white/20 text-center min-w-[80px] md:min-w-[100px]">
              <p className="text-2xl font-black text-white">{teachers.length}</p>
              <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mt-1">Total</p>
            </div>
            <div className="bg-emerald-500/20 p-3 md:p-4 rounded-2xl border border-emerald-400/30 text-center min-w-[80px] md:min-w-[100px]">
              <p className="text-2xl font-black text-emerald-300">{paidTeacherIds.length}</p>
              <p className="text-[10px] font-bold text-emerald-200 uppercase tracking-widest mt-1">Paid</p>
            </div>
            <div className="bg-red-500/20 p-3 md:p-4 rounded-2xl border border-red-400/30 text-center min-w-[80px] md:min-w-[100px]">
              <p className="text-2xl font-black text-red-300">{unpaidTeachers.length}</p>
              <p className="text-[10px] font-bold text-red-200 uppercase tracking-widest mt-1">Unpaid</p>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-2 mt-8 relative z-10 bg-black/20 p-1.5 rounded-2xl inline-flex">
          <button onClick={() => setActiveTab("teachers")}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
              activeTab === "teachers" ? "bg-indigo-500 text-white shadow-lg" : "text-slate-300 hover:text-white"
            }`}>
            <UserPlus className="w-4 h-4" /> Directory
          </button>
          <button onClick={() => setActiveTab("salary")}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
              activeTab === "salary" ? "bg-emerald-500 text-white shadow-lg" : "text-slate-300 hover:text-white"
            }`}>
            <Wallet className="w-4 h-4" /> Salaries
          </button>
        </div>
      </div>

      {/* 👨‍🏫 TEACHERS TAB */}
      {activeTab === "teachers" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-1">
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm sticky top-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                  <UserPlus className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-black text-slate-800">Add New Teacher</h2>
              </div>
              <p className="text-xs text-slate-500 font-medium mb-6 ml-1">
                Enter details to grant portal access.
              </p>

              <form onSubmit={handleAddTeacher} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Full Name *</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                      placeholder="e.g. Sir Ahmad Ali" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black text-indigo-600 uppercase tracking-widest ml-1 flex justify-between items-center">
                    <span>Email (Login ID) *</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" />
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-indigo-50 border border-indigo-100 rounded-xl text-sm font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all"
                      placeholder="teacher@school.com" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Phone</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={phone} onChange={e => setPhone(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                      placeholder="0300-1234567" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Degree / Qualification</label>
                  <div className="relative">
                    <GraduationCap className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={degree} onChange={e => setDegree(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                      placeholder="e.g. M.Phil Mathematics" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Specialty</label>
                    <div className="relative">
                      <BookOpen className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" value={subjectSpecialty} onChange={e => setSubjectSpecialty(e.target.value)}
                        className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        placeholder="Maths" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-black text-emerald-600 uppercase tracking-widest ml-1">Salary (Rs)</label>
                    <div className="relative">
                      <Wallet className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                      <input type="number" value={monthlySalary} onChange={e => setMonthlySalary(e.target.value)}
                        className="w-full pl-9 pr-3 py-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm font-black text-emerald-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                        placeholder="25000" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Joining Date</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="date" value={joiningDate} onChange={e => setJoiningDate(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                  </div>
                </div>

                <button type="submit" disabled={isSubmitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-black shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70 mt-6">
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ShieldCheck className="w-5 h-5" /> Authorize & Register</>}
                </button>
              </form>
            </div>
          </div>

          <div className="xl:col-span-2 space-y-6">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full py-4 pl-12 pr-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                placeholder="Search staff directory by name, email, or subject..." />
            </div>

            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 bg-white rounded-[2rem] border border-slate-200 shadow-sm">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                <p className="text-slate-400 font-bold">Loading staff directory...</p>
              </div>
            ) : filteredTeachers.length === 0 ? (
              <div className="bg-white p-12 rounded-[2rem] border border-slate-200 shadow-sm text-center">
                <User className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-600 font-bold text-lg">No teachers found in directory.</p>
                <p className="text-slate-400 text-sm mt-1">Use the form to register new staff members.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-5">
                {filteredTeachers.map(teacher => {
                  const isPaid = paidTeacherIds.includes(teacher.id);
                  return (
                    <div key={teacher.id} className="bg-white p-6 rounded-[1.5rem] border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all relative group">
                      <button onClick={() => handleDeleteTeacher(teacher.id, teacher.full_name)}
                        className="absolute top-4 right-4 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="flex items-start justify-between mb-4 pr-8">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl flex items-center justify-center text-xl font-black shadow-md">
                            {teacher.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-lg font-black text-slate-800 line-clamp-1">{teacher.full_name}</h3>
                            <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-md inline-block ${
                              isPaid ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                            }`}>
                              {isPaid ? "✓ Paid" : "⚠ Unpaid"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2.5 pt-2">
                        <div className="flex items-center gap-2.5 text-sm">
                          <div className="w-6 flex justify-center"><Mail className="w-4 h-4 text-indigo-400" /></div>
                          <span className="font-bold text-slate-600 truncate">{teacher.email}</span>
                        </div>
                        {teacher.phone && (
                          <div className="flex items-center gap-2.5 text-sm">
                            <div className="w-6 flex justify-center"><Phone className="w-4 h-4 text-slate-400" /></div>
                            <span className="font-medium text-slate-500">{teacher.phone}</span>
                          </div>
                        )}
                        {teacher.subject_specialty && (
                          <div className="flex items-center gap-2.5 text-sm">
                            <div className="w-6 flex justify-center"><Award className="w-4 h-4 text-amber-500" /></div>
                            <span className="font-medium text-slate-500">{teacher.subject_specialty}</span>
                          </div>
                        )}
                        {teacher.degree && (
                          <div className="flex items-center gap-2.5 text-sm">
                            <div className="w-6 flex justify-center"><GraduationCap className="w-4 h-4 text-slate-400" /></div>
                            <span className="font-medium text-slate-500 line-clamp-1">{teacher.degree}</span>
                          </div>
                        )}
                        {teacher.salary > 0 && (
                          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monthly Salary</span>
                            <span className="text-base font-black text-emerald-600">Rs. {teacher.salary?.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 💰 SALARY TAB */}
      {activeTab === "salary" && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
              <div className="bg-indigo-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
              </div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Total Monthly Payroll</p>
              <p className="text-3xl font-black text-slate-800 mt-1">Rs. {totalMonthlySalary.toLocaleString()}</p>
            </div>
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
              <div className="bg-emerald-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Paid This Month</p>
              <p className="text-3xl font-black text-emerald-600 mt-1">Rs. {totalPaidThisMonth.toLocaleString()}</p>
            </div>
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
              <div className="bg-rose-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-rose-600" />
              </div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Unpaid Staff</p>
              <p className="text-3xl font-black text-rose-600 mt-1">{unpaidTeachers.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-1">
              <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm sticky top-8">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-black text-slate-800">Process Salary</h2>
                </div>

                <form onSubmit={handlePaySalary} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Select Teacher *</label>
                    <select value={salaryTeacherId} onChange={e => handleTeacherSelect(e.target.value)}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" required>
                      <option value="" disabled>-- Select a teacher --</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.full_name} {paidTeacherIds.includes(t.id) ? "(Paid)" : "(Unpaid)"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Month</label>
                      <select value={salaryMonth} onChange={e => setSalaryMonth(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all">
                        {months.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Year</label>
                      <input type="text" value={salaryYear} onChange={e => setSalaryYear(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <label className="block text-[11px] font-black text-emerald-600 uppercase tracking-widest ml-1">Payment Amount (Rs.) *</label>
                    <div className="relative">
                      <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                      <input type="number" required value={salaryAmount} onChange={e => setSalaryAmount(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-lg font-black text-emerald-900 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 outline-none transition-all"
                        placeholder="0" />
                    </div>
                  </div>

                  <button type="submit" disabled={isSubmitting}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-black shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70 mt-4">
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Mark as Paid"}
                  </button>
                </form>
              </div>
            </div>

            <div className="xl:col-span-2 space-y-6">
              {unpaidTeachers.length > 0 && (
                <div className="bg-rose-50 border border-rose-100 p-6 rounded-[2rem]">
                  <h3 className="text-lg font-black text-rose-700 mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" /> Pending Salaries ({currentMonth} {currentYear})
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {unpaidTeachers.map(t => (
                      <div key={t.id} className="bg-white p-4 rounded-2xl flex items-center justify-between border border-rose-100 shadow-sm">
                        <div>
                          <p className="font-bold text-slate-800">{t.full_name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Not Paid</p>
                        </div>
                        <span className="text-sm font-black text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg">
                          Rs. {(t.salary || 0).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {unpaidTeachers.length === 0 && teachers.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[2rem] text-center shadow-sm">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <p className="text-emerald-700 font-black text-xl">100% Payroll Cleared!</p>
                  <p className="text-emerald-600/80 font-medium mt-1">All staff have been paid for {currentMonth}.</p>
                </div>
              )}

              <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 md:p-8 border-b border-slate-100">
                  <h3 className="text-xl font-black text-slate-800">Transaction History</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[600px]">
                    <thead className="bg-slate-50/80 border-b border-slate-200">
                      <tr>
                        <th className="p-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Teacher</th>
                        <th className="p-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Billing Period</th>
                        <th className="p-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Disbursed Amount</th>
                        <th className="p-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {salaryRecords.length === 0 ? (
                        <tr><td colSpan={4} className="p-12 text-center text-slate-400 font-medium text-sm">No transaction records found.</td></tr>
                      ) : (
                        salaryRecords.map(record => (
                          <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="p-5">
                              <div className="font-bold text-slate-800">{record.teacher_name}</div>
                              <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mt-1 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Payment Verified
                              </div>
                            </td>
                            <td className="p-5">
                              <div className="flex items-center gap-2 text-slate-600 font-semibold text-sm">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                {record.month} {record.year}
                              </div>
                            </td>
                            <td className="p-5">
                              <span className="font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                                Rs. {record.amount_paid?.toLocaleString()}
                              </span>
                            </td>
                            <td className="p-5 text-right">
                              <button onClick={() => handleDeleteSalary(record.id)}
                                className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-100 opacity-0 group-hover:opacity-100">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTeachersPage;