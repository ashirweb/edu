import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, X, CalendarDays, Clock, RefreshCcw, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminTimetablePage = () => {
  const [timetable, setTimetable] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    class_name: "",
    class_id: "",
    subject_name: "",
    teacher_name: "",
    day_of_week: "Monday",
    start_time: "08:00",
    end_time: "08:45",
  });

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const { data: ttData } = await supabase.from("timetable").select("*").order("day_of_week");
      if (ttData) setTimetable(ttData);

      // Classes with their id and name
      const { data: clsData } = await supabase.from("classes").select("id, name");
      if (clsData) setClasses(clsData);

      // All subjects with class_id for filtering
      const { data: subData } = await supabase.from("subjects").select("id, name, code, class_id");
      if (subData) setAllSubjects(subData);

      const { data: trData } = await supabase.from("teachers").select("*");
      if (trData) setTeachers(trData);
    } catch (error: any) {
      toast.error("Error loading data: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // ✅ Jab class change ho — usi class ke subjects filter karo
  const handleClassChange = (classId: string, className: string) => {
    setFormData(prev => ({ ...prev, class_id: classId, class_name: className, subject_name: "" }));

    const classSubjects = allSubjects.filter(s => s.class_id === classId);
    setFilteredSubjects(classSubjects);

    if (classSubjects.length === 0) {
      toast.warning(`No subjects found for ${className}. Add subjects from the Subjects page.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject_name) return toast.error("Please select a subject!");
    try {
      const payload = {
        class_name: formData.class_name,
        subject_name: formData.subject_name,
        teacher_name: formData.teacher_name,
        day_of_week: formData.day_of_week,
        start_time: formData.start_time.length === 5 ? `${formData.start_time}:00` : formData.start_time,
        end_time: formData.end_time.length === 5 ? `${formData.end_time}:00` : formData.end_time,
      };

      const result = editingId
        ? await supabase.from("timetable").update(payload).eq("id", editingId)
        : await supabase.from("timetable").insert([payload]);

      if (result.error) throw result.error;

      toast.success(editingId ? "Schedule updated!" : "Class scheduled successfully!");
      fetchAllData();
      closeModal();
    } catch (error: any) {
      toast.error("Error: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this schedule?")) return;
    const { error } = await supabase.from("timetable").delete().eq("id", id);
    if (error) toast.error("Error: " + error.message);
    else { toast.success("Schedule deleted!"); fetchAllData(); }
  };

  const handleEditClick = (tt: any) => {
    // Find class id from class name
    const cls = classes.find(c => c.name === tt.class_name);
    const classId = cls?.id || "";

    // Filter subjects for this class
    const classSubjects = allSubjects.filter(s => s.class_id === classId);
    setFilteredSubjects(classSubjects);

    setFormData({
      class_name: tt.class_name,
      class_id: classId,
      subject_name: tt.subject_name,
      teacher_name: tt.teacher_name,
      day_of_week: tt.day_of_week,
      start_time: tt.start_time.substring(0, 5),
      end_time: tt.end_time.substring(0, 5),
    });
    setEditingId(tt.id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFilteredSubjects([]);
    setFormData({ class_name: "", class_id: "", subject_name: "", teacher_name: "", day_of_week: "Monday", start_time: "08:00", end_time: "08:45" });
    setEditingId(null);
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const dayColors: Record<string, string> = {
    Monday: "bg-violet-100 text-violet-700",
    Tuesday: "bg-sky-100 text-sky-700",
    Wednesday: "bg-emerald-100 text-emerald-700",
    Thursday: "bg-amber-100 text-amber-700",
    Friday: "bg-rose-100 text-rose-700",
    Saturday: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen">

      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-indigo-100">
        <div>
          <h1 className="text-2xl font-black text-indigo-900 tracking-tight">Class Timetable</h1>
          <p className="text-green-600 text-sm font-medium flex items-center gap-1 mt-1">
            <RefreshCcw className="w-3 h-3" /> System Live
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all font-bold"
        >
          <Plus className="w-5 h-5" /> Schedule Class
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-indigo-50/50 border-b border-indigo-100">
              <tr>
                <th className="p-4 text-xs font-bold text-indigo-500 uppercase">Day</th>
                <th className="p-4 text-xs font-bold text-indigo-500 uppercase">Time</th>
                <th className="p-4 text-xs font-bold text-indigo-500 uppercase">Class</th>
                <th className="p-4 text-xs font-bold text-indigo-500 uppercase">Subject</th>
                <th className="p-4 text-xs font-bold text-indigo-500 uppercase">Teacher</th>
                <th className="p-4 text-xs font-bold text-indigo-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={6} className="p-10 text-center text-gray-400">Loading schedule...</td></tr>
              ) : timetable.length === 0 ? (
                <tr><td colSpan={6} className="p-10 text-center text-gray-400">No classes scheduled yet.</td></tr>
              ) : (
                timetable.map((tt) => (
                  <tr key={tt.id} className="hover:bg-indigo-50/30">
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${dayColors[tt.day_of_week] || "bg-gray-100 text-gray-700"}`}>
                        {tt.day_of_week}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-amber-600">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" /> {formatTime(tt.start_time)} - {formatTime(tt.end_time)}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase">
                        {tt.class_name}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-gray-700">{tt.subject_name}</td>
                    <td className="p-4 text-gray-600 font-medium">{tt.teacher_name}</td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEditClick(tt)} className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(tt.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-indigo-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-4 mb-4">
              <h2 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
                <CalendarDays className="text-indigo-600 w-6 h-6" />
                {editingId ? "Edit Schedule" : "New Schedule"}
              </h2>
              <button onClick={closeModal}><X className="text-gray-400 hover:text-gray-600" /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">

                {/* Class Selector */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Class</label>
                  <select
                    required
                    className="w-full mt-1 border-2 border-gray-100 rounded-xl p-3 outline-none focus:border-indigo-500 bg-white"
                    value={formData.class_id}
                    onChange={(e) => {
                      const cls = classes.find(c => c.id === e.target.value);
                      handleClassChange(e.target.value, cls?.name || "");
                    }}
                  >
                    <option value="" disabled>Select...</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Day Selector */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Day</label>
                  <select
                    required
                    className="w-full mt-1 border-2 border-gray-100 rounded-xl p-3 outline-none focus:border-indigo-500 bg-white"
                    value={formData.day_of_week}
                    onChange={(e) => setFormData({ ...formData, day_of_week: e.target.value })}
                  >
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Subject Selector — filtered by class */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  Subject
                  {formData.class_name && (
                    <span className="ml-1 text-indigo-500 normal-case font-medium">
                      — {filteredSubjects.length} found for {formData.class_name}
                    </span>
                  )}
                </label>
                <select
                  required
                  disabled={!formData.class_id}
                  className={`w-full mt-1 border-2 rounded-xl p-3 outline-none focus:border-indigo-500 bg-white transition-colors ${
                    !formData.class_id
                      ? "border-gray-50 text-gray-300 cursor-not-allowed"
                      : filteredSubjects.length === 0
                      ? "border-red-100 text-red-400"
                      : "border-gray-100"
                  }`}
                  value={formData.subject_name}
                  onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
                >
                  <option value="" disabled>
                    {!formData.class_id
                      ? "Select a class first..."
                      : filteredSubjects.length === 0
                      ? "No subjects for this class"
                      : "Select Subject..."}
                  </option>
                  {filteredSubjects.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}{s.code ? ` (${s.code})` : ""}
                    </option>
                  ))}
                </select>
                {formData.class_id && filteredSubjects.length === 0 && (
                  <p className="text-xs text-red-400 mt-1 font-medium">
                    ⚠ No subjects assigned to this class. Add them from the Subjects page first.
                  </p>
                )}
              </div>

              {/* Teacher Selector */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Teacher</label>
                <select
                  required
                  className="w-full mt-1 border-2 border-gray-100 rounded-xl p-3 outline-none focus:border-indigo-500 bg-white"
                  value={formData.teacher_name}
                  onChange={(e) => setFormData({ ...formData, teacher_name: e.target.value })}
                >
                  <option value="" disabled>Select Teacher...</option>
                  {teachers.length === 0 ? (
                    <option disabled>No teachers found</option>
                  ) : (
                    teachers.map((t) => {
                      const name = t.full_name || t.name || "Unknown";
                      const empId = t.employee_id || `EMP-${(t.id || "0000").substring(0, 4).toUpperCase()}`;
                      return <option key={t.id} value={name}>{name} ({empId})</option>;
                    })
                  )}
                </select>
              </div>

              {/* Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Start Time</label>
                  <input
                    required type="time"
                    className="w-full mt-1 border-2 border-gray-100 rounded-xl p-3 outline-none focus:border-indigo-500 bg-white"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">End Time</label>
                  <input
                    required type="time"
                    className="w-full mt-1 border-2 border-gray-100 rounded-xl p-3 outline-none focus:border-indigo-500 bg-white"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="flex-1 p-3 border-2 border-gray-100 rounded-xl font-bold text-gray-500 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" className="flex-1 p-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">
                  {editingId ? "Update" : "Save Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTimetablePage;