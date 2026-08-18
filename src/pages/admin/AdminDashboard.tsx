import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, GraduationCap, Wallet, Briefcase, TrendingUp, TrendingDown, Loader2, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    classes: 0,
    revenue: 0,
    expenses: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    // Agar background mein auto-refresh ho raha hai to dobara loading spinner na dikhayein
    // Is liye setIsLoading(true) ko conditionally manage kar sakte hain, par safety ke liye rehne dein.
    try {
      // 1. Fetch Basic Counts
      const { count: studentCount } = await supabase.from('students').select('*', { count: 'exact', head: true });
      const { count: teacherCount } = await supabase.from('teachers').select('*', { count: 'exact', head: true });
      const { count: classCount } = await supabase.from('classes').select('*', { count: 'exact', head: true });

      // 2. Fetch Financials (Fees & Salaries)
      const { data: fees } = await supabase.from('fees').select('amount_paid, month, year');
      const { data: salaries } = await supabase.from('teacher_salaries').select('amount_paid, month, year');

      // 3. Calculate Totals
      const totalRevenue = (fees || []).reduce((sum, f) => sum + Number(f.amount_paid || 0), 0);
      const totalExpenses = (salaries || []).reduce((sum, s) => sum + Number(s.amount_paid || 0), 0);

      setStats({
        students: studentCount || 0,
        teachers: teacherCount || 0,
        classes: classCount || 0,
        revenue: totalRevenue,
        expenses: totalExpenses
      });

      // 4. Prepare Chart Data (Grouping by Month)
      const monthlyData: Record<string, any> = {};
      const currentYear = new Date().getFullYear().toString();

      // Initialize months
      const monthsList = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      monthsList.forEach(m => {
        monthlyData[m] = { name: m.substring(0, 3), Revenue: 0, Expenses: 0 };
      });

      // Add Fees to Revenue
      (fees || []).forEach(f => {
        if (f.year === currentYear && monthlyData[f.month]) {
          monthlyData[f.month].Revenue += Number(f.amount_paid);
        }
      });

      // Add Salaries to Expenses
      (salaries || []).forEach(s => {
        if (s.year === currentYear && monthlyData[s.month]) {
          monthlyData[s.month].Expenses += Number(s.amount_paid);
        }
      });

      // Filter out only months that have data up to current month for cleaner chart
      const currentMonthIndex = new Date().getMonth();
      const finalChartData = monthsList.slice(0, currentMonthIndex + 1).map(m => monthlyData[m]);
      
      setChartData(finalChartData);

    } catch (error) {
      console.error("Dashboard Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // 1. Pehli dafa data load karein
    fetchDashboardData();

    // 2. Supabase Realtime Subscription Setup (LIVE DATA ke liye)
    const dashboardChannel = supabase.channel('admin-dashboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teachers' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classes' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fees' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teacher_salaries' }, () => fetchDashboardData())
      .subscribe();

    // Cleanup function jab component unmount ho
    return () => {
      supabase.removeChannel(dashboardChannel);
    };
  }, []);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  if (isLoading && stats.students === 0) {
    return <div className="h-screen flex items-center justify-center bg-[#fcfcfd]"><Loader2 className="w-12 h-12 text-indigo-600 animate-spin" /></div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-[#fcfcfd] min-h-screen">
      
      {/* 🟢 HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 p-10 rounded-[3rem] shadow-2xl text-white gap-6">
        <div>
          <h1 className="text-4xl font-black italic tracking-tight">Welcome, Principal! 👋</h1>
          <p className="text-slate-400 font-bold mt-2 text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4" /> {today}
          </p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-3xl backdrop-blur-sm flex gap-6">
          <div className="text-center px-4 border-r border-slate-700">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Net Profit</p>
            <p className="text-2xl font-black text-white">Rs. {stats.revenue - stats.expenses}</p>
          </div>
          <div className="text-center px-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Total Classes</p>
            <p className="text-2xl font-black text-white">{stats.classes}</p>
          </div>
        </div>
      </div>

      {/* 🟢 STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Revenue Card */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50 hover:shadow-xl transition-all group">
          <div className="bg-emerald-50 text-emerald-600 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><Wallet className="w-7 h-7" /></div>
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Total Revenue</p>
          <h2 className="text-3xl font-black text-slate-800 mt-1">Rs. {stats.revenue}</h2>
          <p className="text-emerald-500 text-xs font-bold mt-4 flex items-center gap-1"><TrendingUp className="w-4 h-4" /> Collected via Fees</p>
        </div>

        {/* Expenses Card */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50 hover:shadow-xl transition-all group">
          <div className="bg-rose-50 text-rose-600 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><TrendingDown className="w-7 h-7" /></div>
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Total Expenses</p>
          <h2 className="text-3xl font-black text-slate-800 mt-1">Rs. {stats.expenses}</h2>
          <p className="text-rose-500 text-xs font-bold mt-4 flex items-center gap-1"><TrendingDown className="w-4 h-4" /> Paid as Salaries</p>
        </div>

        {/* Students Card */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50 hover:shadow-xl transition-all group">
          <div className="bg-indigo-50 text-indigo-600 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><GraduationCap className="w-7 h-7" /></div>
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Active Students</p>
          <h2 className="text-3xl font-black text-slate-800 mt-1">{stats.students}</h2>
          <p className="text-indigo-500 text-xs font-bold mt-4 flex items-center gap-1">Enrolled in Campus</p>
        </div>

        {/* Staff Card */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50 hover:shadow-xl transition-all group">
          <div className="bg-amber-50 text-amber-600 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><Briefcase className="w-7 h-7" /></div>
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Total Staff</p>
          <h2 className="text-3xl font-black text-slate-800 mt-1">{stats.teachers}</h2>
          <p className="text-amber-500 text-xs font-bold mt-4 flex items-center gap-1">Teaching & Admin</p>
        </div>
      </div>

      {/* 🟢 FINANCIAL CHART SECTION */}
      <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-white">
        <div className="mb-8">
          <h2 className="text-2xl font-black text-slate-800 italic">Financial Analytics</h2>
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mt-1">Revenue vs Expenses ({new Date().getFullYear()})</p>
        </div>
        
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 'bold'}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 'bold'}} dx={-10} />
              <Tooltip 
                cursor={{fill: '#f8fafc'}}
                contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold'}}
              />
              <Legend wrapperStyle={{paddingTop: '20px', fontWeight: 'bold', fontSize: '12px'}} />
              <Bar dataKey="Revenue" fill="#10b981" radius={[8, 8, 8, 8]} barSize={40} />
              <Bar dataKey="Expenses" fill="#f43f5e" radius={[8, 8, 8, 8]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};

export default AdminDashboard;