import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Wallet, Search, Printer, Trash2, Loader2, 
  AlertCircle, CheckCircle2, User, Calendar, CreditCard
} from "lucide-react";
import { toast } from "sonner";

const AdminFeesPage = () => {
  const [activeTab, setActiveTab] = useState<'collection' | 'defaulters'>('collection');
  const [students, setStudents] = useState<any[]>([]);
  const [feesData, setFeesData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const currentYear = new Date().getFullYear().toString();

  const [feeForm, setFeeForm] = useState({
    student_id: "",
    amount: ""
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Fees
      const { data: fe, error: feeError } = await supabase
        .from("fees")
        .select("*")
        .order('created_at', { ascending: false });
        
      if (feeError) throw feeError;
      if (fe) setFeesData(fe);

      // 2. Fetch Students (Super Safe Fallback)
      let studentData = [];
      const { data: stuWithFee, error: stuError } = await supabase
        .from("students")
        .select("*, classes(name, monthly_fee)");

      if (stuError) {
        console.warn("Relationship issue detected. Falling back to basic students fetch...", stuError.message);
        
        // PURE FALLBACK: Siraf students fetch karega bina classes join kiye, taake dropdown khali na rahe
        const { data: stuFallback, error: fallbackError } = await supabase
          .from("students")
          .select("*");
          
        if (fallbackError) throw fallbackError;
        studentData = stuFallback || [];
      } else {
        studentData = stuWithFee || [];
      }
      
      setStudents(studentData);
    } catch (e: any) { 
      toast.error("Database connection error. Please refresh.");
      console.error(e);
    } finally { 
      setIsLoading(false); 
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  const paidStudentIds = feesData
    .filter(f => f.month === currentMonth && f.year === currentYear)
    .map(f => f.student_id);
    
  const defaulters = students.filter(s => !paidStudentIds.includes(s.id));

  const handleStudentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sId = e.target.value;
    const selectedStu = students.find(s => s.id === sId);
    
    // Agar classes join nahi hui, to fallback empty string par chala jayega (app crash nahi hogi)
    const classFee = selectedStu?.classes?.monthly_fee || ""; 
    setFeeForm({ student_id: sId, amount: classFee.toString() });
  };

  const handleSaveFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feeForm.student_id || !feeForm.amount) {
      toast.error("Please select a student and enter an amount.");
      return;
    }
    
    setIsSaving(true);
    try {
      const selectedStu = students.find(s => s.id === feeForm.student_id);
      const sName = selectedStu?.full_name || selectedStu?.name || "Unknown";

      const alreadyPaid = feesData.some(f => f.student_id === feeForm.student_id && f.month === currentMonth && f.year === currentYear);
      if (alreadyPaid) {
        if(!window.confirm(`${sName} has already paid for ${currentMonth}. Add another receipt anyway?`)) {
          setIsSaving(false);
          return;
        }
      }

      const { error } = await supabase.from("fees").insert([{
        student_id: feeForm.student_id,
        student_name: sName,
        month: currentMonth,
        year: currentYear,
        amount_paid: parseFloat(feeForm.amount),
        status: 'Paid'
      }]);

      if (error) throw error;
      
      toast.success("Fee successfully recorded.", { icon: "✅" });
      setFeeForm({ amount: "", student_id: "" });
      fetchData(); 
    } catch (err: any) {
      toast.error("Failed to save fee: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFee = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this fee record?")) return;
    try {
      const { error } = await supabase.from("fees").delete().eq('id', id);
      if (error) throw error;
      toast.success("Record deleted successfully.");
      fetchData();
    } catch (err: any) {
      toast.error("Deletion failed.");
    }
  };

  const handlePrint = (f: any) => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Fee Receipt - ${f.student_name}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; }
            .receipt-box { border: 2px solid #e2e8f0; padding: 40px; max-width: 500px; margin: auto; border-radius: 12px; }
            .header { text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 30px; }
            .title { color: #0f172a; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 1px; }
            .subtitle { color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 15px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 10px; }
            .label { color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; }
            .value { font-weight: 700; color: #0f172a; }
            .amount { font-size: 20px; color: #10b981; font-weight: 900; }
            .signature { text-align: right; margin-top: 60px; font-size: 14px; color: #64748b; }
            .badge { background: #d1fae5; color: #047857; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="receipt-box">
            <div class="header">
              <h2 class="title">OFFICIAL RECEIPT</h2>
              <p class="subtitle">EduFlow Academy</p>
            </div>
            
            <div class="row">
              <span class="label">Receipt No.</span>
              <span class="value">#${f.id.substring(0, 8).toUpperCase()}</span>
            </div>
            <div class="row">
              <span class="label">Student Name</span>
              <span class="value">${f.student_name}</span>
            </div>
            <div class="row">
              <span class="label">Billing Month</span>
              <span class="value">${f.month} ${f.year}</span>
            </div>
            <div class="row">
              <span class="label">Status</span>
              <span class="badge">PAID IN FULL</span>
            </div>
            
            <div class="row" style="margin-top: 30px; border: none;">
              <span class="label" style="line-height: 28px;">Total Amount</span>
              <span class="amount">Rs. ${f.amount_paid}</span>
            </div>
            
            <div class="signature">
              _________________________<br/><br/>Authorized Signature
            </div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="p-6 md:p-10 max-w-[1600px] mx-auto space-y-8 bg-slate-50/50 min-h-screen font-sans">
      
      {/* PROFESSIONAL HEADER */}
      <header className="bg-white border border-slate-200 p-8 rounded-[2rem] shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 print:hidden">
        <div className="flex items-center gap-5">
          <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
             <Wallet className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Financial Accounts</h1>
            <p className="text-slate-500 font-medium mt-1">Manage fee collections and track outstanding dues.</p>
          </div>
        </div>
        
        {/* TAB NAVIGATION */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-inner">
          <button 
            onClick={() => setActiveTab('collection')} 
            className={`px-6 py-2.5 rounded-lg font-bold transition-all text-sm flex items-center gap-2 ${
              activeTab === 'collection' 
                ? 'bg-white text-emerald-600 shadow-sm border border-slate-200/50' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" /> Paid Records
          </button>
          <button 
            onClick={() => setActiveTab('defaulters')} 
            className={`px-6 py-2.5 rounded-lg font-bold transition-all text-sm flex items-center gap-2 ${
              activeTab === 'defaulters' 
                ? 'bg-white text-rose-600 shadow-sm border border-slate-200/50' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <AlertCircle className="w-4 h-4" /> Defaulters
            {defaulters.length > 0 && (
              <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'defaulters' ? 'bg-rose-100' : 'bg-slate-200'}`}>
                {defaulters.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {activeTab === 'collection' ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* LEFT: PAYMENT FORM */}
          <div className="xl:col-span-4 space-y-6">
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                <CreditCard className="w-5 h-5 text-emerald-500" />
                <h2 className="text-lg font-bold text-slate-800">Process Payment</h2>
              </div>

              <form onSubmit={handleSaveFee} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Select Student</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select 
                      required 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none" 
                      value={feeForm.student_id} 
                      onChange={handleStudentChange}
                    >
                      <option value="" disabled>-- Choose a student --</option>
                      {students.map(s => <option key={s.id} value={s.id}>{s.full_name || s.name}</option>)}
                    </select>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Amount Received (Rs.)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rs.</span>
                    <input 
                      required 
                      type="number" 
                      placeholder="0.00" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" 
                      value={feeForm.amount} 
                      onChange={(e) => setFeeForm({...feeForm, amount: e.target.value})} 
                    />
                  </div>
                </div>
                
                <button 
                  disabled={isSaving} 
                  className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-bold shadow-md shadow-emerald-500/20 hover:bg-emerald-700 active:scale-[0.98] transition-all flex justify-center items-center gap-2 mt-6 disabled:opacity-70"
                >
                  {isSaving ? <Loader2 className="animate-spin w-5 h-5" /> : "Record Payment"}
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT: PAID LIST */}
          <div className="xl:col-span-8 space-y-6">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-emerald-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search transaction by student name..." 
                className="w-full py-4 pl-12 pr-4 bg-white rounded-2xl shadow-sm border border-slate-200 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
              />
            </div>

            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/80 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Student Details</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Billing Period</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Amount & Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoading ? (
                      <tr><td colSpan={3} className="p-12"><div className="flex flex-col items-center justify-center text-slate-400 gap-2"><Loader2 className="animate-spin w-8 h-8 text-emerald-500" /><p className="text-sm font-medium">Loading records...</p></div></td></tr>
                    ) : feesData.filter(f => f.student_name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                      <tr><td colSpan={3} className="p-12 text-center text-slate-500 font-medium text-sm">No transaction records found.</td></tr>
                    ) : feesData.filter(f => f.student_name.toLowerCase().includes(searchQuery.toLowerCase())).map((f) => (
                      <tr key={f.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{f.student_name}</div>
                          <div className="text-[11px] text-emerald-600 font-bold uppercase tracking-wide flex items-center gap-1 mt-1">
                            <CheckCircle2 className="w-3.5 h-3.5"/> Verified
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-slate-600 font-semibold text-sm">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            {f.month} {f.year}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-4">
                            <span className="font-extrabold text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg text-sm border border-slate-200">
                              Rs. {f.amount_paid}
                            </span>
                            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handlePrint(f)} title="Print Receipt" className="p-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-emerald-600 transition-colors">
                                <Printer className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteFee(f.id)} title="Delete Record" className="p-2 text-rose-500 bg-white border border-rose-100 rounded-lg hover:bg-rose-50 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* DEFAULTERS TAB */
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-200 flex justify-between items-center bg-rose-50/50">
            <div>
              <h2 className="text-xl font-bold text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" /> Outstanding Dues
              </h2>
              <p className="text-rose-500/80 font-semibold text-xs uppercase tracking-wider mt-1">Pending payments for {currentMonth} {currentYear}</p>
            </div>
            <div className="bg-rose-100 text-rose-700 px-4 py-1.5 rounded-full text-sm font-bold border border-rose-200">
              {defaulters.length} Pending
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th className="px-8 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Student Name</th>
                  <th className="px-8 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Enrolled Class</th>
                  <th className="px-8 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Expected Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr><td colSpan={3} className="p-12 text-center text-slate-500"><Loader2 className="animate-spin w-6 h-6 mx-auto mb-2" /> Loading...</td></tr>
                ) : defaulters.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-16 text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-4">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-800">100% Collection Rate</h3>
                      <p className="text-slate-500 mt-1 text-sm">All students have cleared their dues for this month.</p>
                    </td>
                  </tr>
                ) : defaulters.map((s) => (
                  <tr key={s.id} className="hover:bg-rose-50/30 transition-colors">
                    <td className="px-8 py-5">
                      <div className="font-bold text-slate-900">{s.full_name || s.name}</div>
                      <div className="text-[11px] text-rose-500 font-bold uppercase tracking-wider mt-0.5">Payment Pending</div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-md text-xs font-bold border border-slate-200">
                        {s.classes?.name || "Unassigned"}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <span className="font-bold text-rose-600 text-lg">
                        Rs. {s.classes?.monthly_fee || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFeesPage;