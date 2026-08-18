import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Megaphone, PlusCircle, Trash2, 
  Search, Loader2, Bell, Calendar 
} from "lucide-react";
import { toast } from "sonner";

const AdminNoticesPage = () => {
  const [notices, setNotices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetAudience, setTargetAudience] = useState("all"); // 'all', 'teachers', 'students'
  const [searchTerm, setSearchTerm] = useState("");

  const fetchNotices = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("notices")
        .select("*")
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

  useEffect(() => {
    fetchNotices();
  }, []);

  const handleAddNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return toast.error("Title and Content are required!");

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("notices").insert([
        { 
          title, 
          content, 
          target_audience: targetAudience 
        }
      ]);

      if (error) throw error;

      toast.success("Notice published successfully! 📢");
      setTitle("");
      setContent("");
      setTargetAudience("all");
      fetchNotices(); 
    } catch (error: any) {
      toast.error("Failed to publish notice.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this notice?")) return;

    try {
      const { error } = await supabase.from("notices").delete().eq("id", id);
      if (error) throw error;
      
      toast.success("Notice deleted.");
      fetchNotices();
    } catch (error: any) {
      toast.error("Failed to delete notice.");
    }
  };

  const filteredNotices = notices.filter(n => 
    n.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    n.content?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-[#f8fafc] min-h-screen">
      
      {/* HEADER SECTION */}
      <div className="bg-gradient-to-br from-purple-900 via-fuchsia-900 to-slate-900 p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 border-b-4 border-purple-400">
        <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <h1 className="text-4xl font-black tracking-tight mb-2 flex items-center gap-3">
            <Megaphone className="w-10 h-10 text-purple-400" /> Notice Board
          </h1>
          <p className="text-purple-200 font-medium text-lg">
            Publish announcements for teachers and students.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ADD NOTICE FORM */}
        <div className="lg:col-span-1">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm sticky top-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                <PlusCircle className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black text-slate-800">New Notice</h2>
            </div>

            <form onSubmit={handleAddNotice} className="space-y-5">
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Notice Title</label>
                <input 
                  type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none" 
                  placeholder="e.g. Holiday Announcement"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Target Audience</label>
                <select 
                  value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  <option value="all">Everyone (Teachers & Students)</option>
                  <option value="teachers">Teachers Only</option>
                  <option value="students">Students Only</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Content</label>
                <textarea 
                  required value={content} onChange={(e) => setContent(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none resize-none h-32" 
                  placeholder="Write the details here..."
                />
              </div>

              <div className="pt-2">
                <button type="submit" disabled={isSubmitting} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-xl font-black shadow-lg shadow-purple-200 transition-all flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Publish Notice"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* NOTICES LIST */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <h2 className="text-xl font-black text-slate-800 px-2">Recent Broadcasts</h2>
            <div className="relative w-72">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Search notices..."
              />
            </div>
          </div>

          {isLoading ? (
            <div className="py-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-purple-500" /></div>
          ) : filteredNotices.length === 0 ? (
            <div className="bg-white p-12 rounded-[2rem] border-2 border-dashed border-slate-200 text-center">
              <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-bold text-lg">No notices published yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredNotices.map((notice) => (
                <div key={notice.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative group">
                  <button onClick={() => handleDelete(notice.id)} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                  
                  <div className="flex items-center gap-3 mb-3 pr-10">
                    <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md ${
                      notice.target_audience === 'all' ? 'bg-blue-100 text-blue-700' : 
                      notice.target_audience === 'teachers' ? 'bg-fuchsia-100 text-fuchsia-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {notice.target_audience === 'all' ? 'Broadcast: All' : `For ${notice.target_audience}`}
                    </span>
                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {new Date(notice.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-black text-slate-800 mb-2">{notice.title}</h3>
                  <p className="text-sm font-medium text-slate-600 whitespace-pre-wrap leading-relaxed">{notice.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminNoticesPage;