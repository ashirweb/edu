import { NavLink, useNavigate } from "react-router-dom";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Users,
  BookOpen, // Icon for Classes
  Calendar, // 👈 Timetable ke liye icon yahan pehle se import hai
  ClipboardList,
  FileText, // Icon for Subjects
  Bell,
  DollarSign,
  LogOut,
  GraduationCap,
  BarChart3,
  Receipt,
  Download,
  Upload,
} from "lucide-react";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

// Navigation structure organized by Groups
const navItems: Record<UserRole, { group: string; items: NavItem[] }[]> = {
  admin: [
    {
      group: "Main",
      items: [
        { label: "Dashboard", path: "/admin", icon: <LayoutDashboard className="w-4 h-4" /> },
      ],
    },
    {
      group: "Academic Core",
      items: [
        { label: "Students", path: "/admin/students", icon: <GraduationCap className="w-4 h-4" /> },
        { label: "Teachers", path: "/admin/teachers", icon: <Users className="w-4 h-4" /> },
        { label: "Classes", path: "/admin/classes", icon: <BookOpen className="w-4 h-4" /> },
        { label: "Subjects", path: "/admin/subjects", icon: <FileText className="w-4 h-4" /> },
        { label: "Timetable", path: "/admin/timetable", icon: <Calendar className="w-4 h-4" /> },
      ],
    },
    {
      group: "Operations",
      items: [
        { label: "Attendance", path: "/admin/attendance", icon: <ClipboardList className="w-4 h-4" /> },
        { label: "Notices", path: "/admin/notices", icon: <Bell className="w-4 h-4" /> },
        { label: "Results", path: "/admin/results", icon: <BarChart3 className="w-4 h-4" /> },
      ],
    },
    {
      group: "Finance",
      items: [
        { label: "Fees", path: "/admin/fees", icon: <DollarSign className="w-4 h-4" /> },
        { label: "Expenses", path: "/admin/expenses", icon: <Receipt className="w-4 h-4" /> },
      ],
    },
  ],
  teacher: [
    {
      group: "Menu",
      items: [
        { label: "Dashboard", path: "/teacher", icon: <LayoutDashboard className="w-4 h-4" /> },
        { label: "My Students", path: "/teacher/students", icon: <GraduationCap className="w-4 h-4" /> },
        { label: "Timetable", path: "/teacher/timetable", icon: <Calendar className="w-4 h-4" /> }, // 👈 YAHAN ADD KIYA HAI!
        { label: "Attendance", path: "/teacher/attendance", icon: <ClipboardList className="w-4 h-4" /> },
        { label: "Upload Results", path: "/teacher/results", icon: <Upload className="w-4 h-4" /> },
        { label: "Notices", path: "/teacher/notices", icon: <Bell className="w-4 h-4" /> },
      ],
    },
  ],
  student: [
    {
      group: "Menu",
      items: [
        { label: "Dashboard", path: "/student", icon: <LayoutDashboard className="w-4 h-4" /> },
        { label: "My Results", path: "/student/results", icon: <BarChart3 className="w-4 h-4" /> },
        { label: "Attendance", path: "/student/attendance", icon: <ClipboardList className="w-4 h-4" /> },
        { label: "Fees", path: "/student/fees", icon: <DollarSign className="w-4 h-4" /> },
        { label: "Notices", path: "/student/notices", icon: <Bell className="w-4 h-4" /> },
      ],
    },
  ],
};

const AppSidebar = () => {
  const { role, userName, logout } = useAuth();
  const navigate = useNavigate();

  if (!role) return null;

  const groups = navItems[role];

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-slate-100 flex flex-col shadow-sm">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-50">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-100">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-black text-slate-900 italic text-lg leading-tight tracking-tighter">EduFlow Pro</h2>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Management System</p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-6 py-4 bg-slate-50/50">
        <div className="text-sm font-black text-slate-800 truncate">{userName}</div>
        <div className="text-[10px] text-indigo-600 font-bold uppercase tracking-tight italic">{role} Portal</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-6 overflow-y-auto custom-scrollbar">
        {groups.map((group) => (
          <div key={group.group} className="space-y-1">
            <h3 className="px-4 text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">
              {group.group}
            </h3>
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === `/${role}`}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 text-sm transition-all rounded-2xl font-bold ${
                    isActive
                      ? "bg-indigo-50 text-indigo-600 shadow-sm shadow-indigo-50/50 italic"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`
                }
              >
                <span className="opacity-80">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-slate-50 bg-slate-50/30">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 text-sm text-slate-400 font-bold hover:text-red-600 hover:bg-red-50 w-full rounded-2xl transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out System</span>
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;