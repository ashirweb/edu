import { BookOpen, BarChart3, ClipboardList, FileText, Bell, DollarSign } from "lucide-react";

const studentInfo = {
  name: "Ali Hassan",
  rollNo: "2026-0142",
  class: "Class 10-A",
  section: "Science",
};

const notices = [
  { title: "Annual examination starts on 25 March", date: "10 Mar 2026", priority: "high" },
  { title: "Science fair registration open", date: "8 Mar 2026", priority: "normal" },
];

const upcomingAssignments = [
  { subject: "Physics", title: "Chapter 5 Numerical Problems", due: "15 Mar 2026", status: "pending" },
  { subject: "Mathematics", title: "Trigonometry Worksheet", due: "13 Mar 2026", status: "pending" },
  { subject: "English", title: "Essay: Climate Change", due: "12 Mar 2026", status: "submitted" },
];

const recentGrades = [
  { subject: "Physics", test: "Monthly Test", marks: 85, total: 100 },
  { subject: "Mathematics", test: "Monthly Test", marks: 92, total: 100 },
  { subject: "Chemistry", test: "Monthly Test", marks: 78, total: 100 },
  { subject: "English", test: "Monthly Test", marks: 88, total: 100 },
];

const getGrade = (marks: number, total: number) => {
  const pct = (marks / total) * 100;
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  return "F";
};

const StudentDashboard = () => {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {studentInfo.name} — {studentInfo.rollNo} — {studentInfo.class}
        </p>
      </div>

      {/* Notices */}
      <section className="space-y-3">
        <h2 className="section-title flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Notices
        </h2>
        <div className="space-y-2">
          {notices.map((n, i) => (
            <div key={i} className="feed-item flex items-center justify-between">
              <div>
                <div className="feed-item-title">{n.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{n.date}</div>
              </div>
              {n.priority === "high" && (
                <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5">
                  Important
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Upcoming Assignments */}
      <section className="space-y-3">
        <h2 className="section-title flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Upcoming Assignments
        </h2>
        <div className="bg-card border border-border">
          <div className="grid grid-cols-4 px-5 py-3 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider font-heading">
            <span>Subject</span>
            <span>Assignment</span>
            <span>Due Date</span>
            <span>Status</span>
          </div>
          {upcomingAssignments.map((a, i) => (
            <div
              key={i}
              className="grid grid-cols-4 px-5 py-3 border-b border-border last:border-b-0 text-sm"
            >
              <span className="font-medium">{a.subject}</span>
              <span>{a.title}</span>
              <span className="text-muted-foreground">{a.due}</span>
              <span>
                {a.status === "submitted" ? (
                  <span className="text-xs bg-success/10 text-success px-2 py-0.5">
                    Submitted
                  </span>
                ) : (
                  <span className="text-xs bg-warning/10 text-warning px-2 py-0.5">
                    Pending
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Grades */}
      <section className="space-y-3">
        <h2 className="section-title flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Recent Grades
        </h2>
        <div className="bg-card border border-border">
          <div className="grid grid-cols-5 px-5 py-3 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider font-heading">
            <span>Subject</span>
            <span>Test</span>
            <span>Marks</span>
            <span>Percentage</span>
            <span>Grade</span>
          </div>
          {recentGrades.map((g, i) => (
            <div
              key={i}
              className="grid grid-cols-5 px-5 py-3 border-b border-border last:border-b-0 text-sm"
            >
              <span className="font-medium">{g.subject}</span>
              <span className="text-muted-foreground">{g.test}</span>
              <span>
                {g.marks}/{g.total}
              </span>
              <span>{((g.marks / g.total) * 100).toFixed(0)}%</span>
              <span className="font-heading font-medium">{getGrade(g.marks, g.total)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Links */}
      <section className="space-y-3">
        <h2 className="section-title">Quick Access</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "My Subjects", icon: <BookOpen className="w-5 h-5" />, path: "/student/subjects" },
            { label: "Attendance", icon: <ClipboardList className="w-5 h-5" />, path: "/student/attendance" },
            { label: "Fee Status", icon: <DollarSign className="w-5 h-5" />, path: "/student/fees" },
            { label: "Results", icon: <BarChart3 className="w-5 h-5" />, path: "/student/results" },
          ].map((link) => (
            <div key={link.label} className="stat-card flex items-center gap-3 cursor-pointer hover:bg-secondary transition-colors">
              <div className="text-muted-foreground">{link.icon}</div>
              <span className="text-sm font-medium font-heading">{link.label}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default StudentDashboard;
