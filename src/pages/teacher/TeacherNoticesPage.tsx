import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, Search, Loader2, Bell, Calendar } from "lucide-react";
import { toast } from "sonner";

const TeacherNoticesPage = () => {
  const [notices, setNotices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchNotices = async () => {
      setIsLoading(true);
      try {
        // 🔒 SECURITY: Only fetch notices meant for 'teachers' or 'all'
        const { data, error } = await supabase
          .from("notices")
          .select("*")
          .in("target_audience", ["all", "teachers"])
          .order("created_at", { ascending: false });

        if (error) throw error;
        setNotices(data || []);
      } catch (error: any) {
        toast.error("Failed to load notices.");
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotices();
  }, []);

  const filteredNotices = notices.filter(n => 
    n.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    n.content?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 bg-[#f8fafc] min-h-screen">
      
      {/* HEADER SECTION */}
      <div className="bg-gradient-to-br from-fuchsia-900 via-purple-800 to-slate-900 p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 border-b-4 border-fuchsia-400">
        <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <h1 className="text-4xl font-black tracking-tight mb-2 flex items-center gap-3">
            <Bell className="w-10 h-10 text-fuchsia-400" /> Official Notices
          </h1>
          <p className="text-fuchsia-100 font-medium text-lg">
            Important announcements from the administration.
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center">
        <div className="relative w-full">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-fuchsia-500"
            placeholder="Search announcements..."
          />
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-fuchsia-500" /></div>
      ) : filteredNotices.length === 0 ? (
        <div className="bg-white p-16 rounded-[2rem] border-2 border-dashed border-slate-200 text-center">
          <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-bold text-lg">No new notices.</p>
          <p className="text-slate-400 text-sm mt-1">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredNotices.map((notice) => (
            <div key={notice.id} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-fuchsia-50 rounded-xl flex items-center justify-center text-fuchsia-600">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">{notice.title}</h3>
                  <span className="text-xs font-bold text-slate-400 flex items-center gap-1 mt-1">
                    <Calendar className="w-3 h-3" /> Published on {new Date(notice.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <p className="text-sm font-medium text-slate-600 whitespace-pre-wrap leading-relaxed bg-slate-50 p-6 rounded-2xl border border-slate-100">
                {notice.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherNoticesPage;