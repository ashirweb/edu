import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Receipt, Plus, Trash2, Wallet, TrendingDown, 
  TrendingUp, Landmark, Loader2, Search, Calendar, DollarSign 
} from "lucide-react";

const AdminExpensesPage = () => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [form, setForm] = useState({ 
    item_name: "", 
    category: "Utility Bill", 
    amount: "" 
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Expenses
      const { data: expData, error: expError } = await supabase
        .from("expenses")
        .select("*")
        .order('expense_date', { ascending: false });
      
      if (expError) throw expError;

      // 2. Fetch Total Income from Fees (amount_paid column)
      const { data: feeData, error: feeError } = await supabase
        .from("fees")
        .select("amount_paid");

      if (feeError) throw feeError;

      const incomeSum = feeData?.reduce((acc, curr) => acc + Number(curr.amount_paid || 0), 0) || 0;

      setExpenses(expData || []);
      setTotalIncome(incomeSum);
    } catch (error: any) {
      console.error("Fetch Error:", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Calculations
  const totalExpense = expenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const netProfit = totalIncome - totalExpense;

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.item_name || !form.amount) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase.from("expenses").insert([{
        item_name: form.item_name,
        category: form.category,
        amount: parseFloat(form.amount),
        expense_date: new Date().toISOString().split('T')[0]
      }]);

      if (error) throw error;
      
      alert("Expense Recorded! 📉");
      setForm({ item_name: "", category: "Utility Bill", amount: "" });
      fetchData();
    } catch (err: any) {
      alert("Save Error: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    await supabase.from("expenses").delete().eq('id', id);
    fetchData();
  };

  const filtered = expenses.filter(ex => 
    ex.item_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-[#f8fafc] min-h-screen">
      
      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-emerald-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-emerald-100 relative overflow-hidden group">
          <TrendingUp className="absolute right-[-10px] bottom-[-10px] w-24 h-24 opacity-10 group-hover:scale-110 transition-transform" />
          <p className="font-bold text-[10px] uppercase opacity-80 tracking-widest">Total Income (Fees)</p>
          <h2 className="text-3xl font-black mt-1">Rs. {totalIncome.toLocaleString()}</h2>
        </div>

        <div className="bg-rose-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-rose-100 relative overflow-hidden group">
          <TrendingDown className="absolute right-[-10px] bottom-[-10px] w-24 h-24 opacity-10 group-hover:scale-110 transition-transform" />
          <p className="font-bold text-[10px] uppercase opacity-80 tracking-widest">Total Expenses</p>
          <h2 className="text-3xl font-black mt-1">Rs. {totalExpense.toLocaleString()}</h2>
        </div>

        <div className={`${netProfit >= 0 ? 'bg-indigo-600' : 'bg-slate-900'} p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100 relative overflow-hidden group`}>
          <Landmark className="absolute right-[-10px] bottom-[-10px] w-24 h-24 opacity-10 group-hover:scale-110 transition-transform" />
          <p className="font-bold text-[10px] uppercase opacity-80 tracking-widest">Net Profit/Loss</p>
          <h2 className="text-3xl font-black mt-1">Rs. {netProfit.toLocaleString()}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form */}
        <div className="lg:col-span-4">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 sticky top-6">
            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                <Receipt className="text-rose-500" /> New Expense
            </h2>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <input required placeholder="Item Name (e.g. Electric Bill)" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-rose-500" value={form.item_name} onChange={e => setForm({...form, item_name: e.target.value})} />
              
              <select className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold outline-none" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                <option value="Utility Bill">Utility Bill</option>
                <option value="Rent">Building Rent</option>
                <option value="Salary">Staff Salary</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Stationery">Stationery</option>
                <option value="Other">Other Misc</option>
              </select>

              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input required type="number" placeholder="Amount (Rs.)" className="w-full bg-slate-50 border-none rounded-2xl p-4 pl-10 font-bold outline-none focus:ring-2 focus:ring-rose-500" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
              </div>

              <button disabled={isSaving} className="w-full p-4 bg-slate-900 hover:bg-rose-600 text-white rounded-2xl font-black shadow-lg transition-all flex items-center justify-center gap-2">
                {isSaving ? <Loader2 className="animate-spin w-5 h-5" /> : <Plus className="w-5 h-5" />} Record Expense
              </button>
            </form>
          </div>
        </div>

        {/* List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search expenses..." className="w-full pl-12 pr-4 py-4 bg-white border-none rounded-2xl shadow-sm font-bold text-sm outline-none focus:ring-2 focus:ring-rose-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 border-b">
                <tr>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  <tr><td colSpan={3} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-rose-300" /></td></tr>
                ) : filtered.map((exp) => (
                  <tr key={exp.id} className="group hover:bg-rose-50/30 transition-all">
                    <td className="p-6">
                      <div className="font-black text-slate-800 text-lg">{exp.item_name}</div>
                      <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1"><Calendar className="w-3 h-3" /> {exp.expense_date}</div>
                    </td>
                    <td className="p-6">
                      <span className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-black uppercase text-slate-500">{exp.category}</span>
                    </td>
                    <td className="p-6 text-right">
                        <div className="flex items-center justify-end gap-3">
                            <span className="font-black text-xl text-rose-600">Rs. {Number(exp.amount).toLocaleString()}</span>
                            <button onClick={() => handleDelete(exp.id)} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
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
  );
};

export default AdminExpensesPage;