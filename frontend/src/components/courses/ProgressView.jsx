import {
  TrendingUp,
  Award,
  BookOpen,
  Calendar,
  CheckCircle,
  FileText,
  Activity,
  ArrowUpRight,
  Target,
  Milestone
} from "lucide-react";
import { useMemo } from "react";
import StatusPill from "../ui/StatusPill";

export default function ProgressView({ courses }) {
  // Filter enrolled courses
  const enrolledCourses = useMemo(() => {
    return courses.filter(
      (c) => (c.status || c.enrollstatus || "").toLowerCase() === "enrolled"
    );
  }, [courses]);

  // Group courses by semester
  const semesterStats = useMemo(() => {
    const semesters = {};
    courses.forEach((course) => {
      const sem = course.semester || "Other";
      if (!semesters[sem]) {
        semesters[sem] = { total: 0, enrolled: 0, waitlisted: 0, open: 0 };
      }
      semesters[sem].total++;
      const status = (course.status || course.enrollstatus || "Enrolled").toLowerCase();
      if (status === "enrolled") semesters[sem].enrolled++;
      else if (status === "waitlisted" || status === "waitlist") semesters[sem].waitlisted++;
      else semesters[sem].open++;
    });
    return Object.entries(semesters).map(([name, data]) => ({
      name,
      ...data,
    }));
  }, [courses]);

  // Compute stats
  const totalCoursesCount = courses.length;
  const enrolledCount = enrolledCourses.length;
  const completionPercentage = totalCoursesCount > 0 ? Math.round((enrolledCount / totalCoursesCount) * 100) : 0;

  // Mock GPA based on enrolled courses
  const mockGPA = useMemo(() => {
    if (enrolledCount === 0) return "N/A";
    // Deterministic GPA based on letters
    const sum = enrolledCourses.reduce((acc, c) => acc + ((c.title || "").length % 3 === 0 ? 4.0 : 3.7), 0);
    return (sum / enrolledCount).toFixed(2);
  }, [enrolledCourses, enrolledCount]);

  // Compute syllabus completions details
  const courseMilestones = useMemo(() => {
    return enrolledCourses.map((c) => {
      // Deterministic milestones
      const length = (c.title || "").length;
      const totalTasks = (length % 5) + 6; // 6 to 10
      const completedTasks = Math.round(totalTasks * (((length * 7) % 55 + 30) / 100)); // matching getMockProgress
      return {
        id: c.id,
        title: c.title || c.task,
        semester: c.semester,
        total: totalTasks,
        completed: completedTasks,
        percent: Math.round((completedTasks / totalTasks) * 100),
      };
    });
  }, [enrolledCourses]);

  return (
    <div className="p-5 sm:p-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1
            className="text-3xl font-extrabold tracking-tight text-[#1a263f]"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Academic Progress & Analytics
          </h1>
          <p className="mt-1.5 text-sm text-[#7a8dac]">
            Analyze course workloads, track GPA records, and check syllabus milestone completions.
          </p>
        </div>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 border border-[#e8ecf4] shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-[#8899b8] uppercase tracking-wider">Cumulative GPA</p>
              <p className="text-3xl font-extrabold text-[#1a263f] mt-1.5">{mockGPA}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-[#eef5fc] flex items-center justify-center text-[#3b7dd8]">
              <Award size={18} />
            </div>
          </div>
          <p className="text-[10px] text-[#22c55e] font-semibold flex items-center gap-1 mt-3">
            <ArrowUpRight size={12} /> Top 10% of class cohort
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#e8ecf4] shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-[#8899b8] uppercase tracking-wider">Enrollment Rate</p>
              <p className="text-3xl font-extrabold text-[#1a263f] mt-1.5">{completionPercentage}%</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-[#f0f9ff] flex items-center justify-center text-[#0ea5e9]">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-4 w-full bg-[#f0f2f8] h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#3b7dd8] h-full rounded-full" style={{ width: `${completionPercentage}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#e8ecf4] shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-[#8899b8] uppercase tracking-wider">Enrolled Courses</p>
              <p className="text-3xl font-extrabold text-[#1a263f] mt-1.5">{enrolledCount}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-[#f0fdf4] flex items-center justify-center text-[#10b981]">
              <CheckCircle size={18} />
            </div>
          </div>
          <p className="text-[10px] text-[#7a8dac] font-medium mt-3">
            Active studying schedule load
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#e8ecf4] shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-[#8899b8] uppercase tracking-wider">Total Curriculums</p>
              <p className="text-3xl font-extrabold text-[#1a263f] mt-1.5">{totalCoursesCount}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-[#f5f7fc] flex items-center justify-center text-[#5a6e92]">
              <BookOpen size={18} />
            </div>
          </div>
          <p className="text-[10px] text-[#7a8dac] font-medium mt-3">
            Available listed modules in portal
          </p>
        </div>
      </div>

      {/* Main Analysis Body */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* LEFT COLUMN: Detailed Milestones */}
        <div className="bg-white rounded-3xl border border-[#eaedf5] p-5 shadow-[0_4px_20px_rgba(30,40,80,0.04)]">
          <div className="flex items-center gap-2 mb-5">
            <Target className="text-[#3b7dd8]" size={18} />
            <h2
              className="text-lg font-bold text-[#1a263f]"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Course Milestones Breakdown
            </h2>
          </div>

          {enrolledCourses.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-[#e8ecf4] rounded-2xl">
              <p className="text-sm font-medium text-[#7a8dac]">No active enrollments</p>
              <p className="text-xs text-[#aab5cc] mt-1">Enroll in modules on the Enrollment tab to view milestone progress here.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {courseMilestones.map((milestone) => (
                <div key={milestone.id} className="p-4 border border-[#e8ecf4] rounded-2xl bg-[#fafbff]">
                  <div className="flex justify-between items-start gap-2 flex-wrap mb-2">
                    <div>
                      <h3 className="text-sm font-extrabold text-[#1a263f]">{milestone.title}</h3>
                      <p className="text-[10px] text-[#8899b8] uppercase font-bold tracking-wider mt-0.5">{milestone.semester}</p>
                    </div>
                    <span className="text-xs font-bold text-[#3b7dd8] bg-[#eef5fc] px-2.5 py-1 rounded-full">
                      {milestone.completed}/{milestone.total} Topics
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-4">
                    <div className="flex-1 bg-[#eef2f9] h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#3b7dd8] to-[#4a6099] h-full rounded-full transition-all duration-700"
                        style={{ width: `${milestone.percent}%` }}
                      />
                    </div>
                    <span className="text-xs font-extrabold text-[#1a263f] shrink-0 w-8 text-right">
                      {milestone.percent}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Semester Load Timeline */}
        <div className="bg-white rounded-3xl border border-[#eaedf5] p-5 shadow-[0_4px_20px_rgba(30,40,80,0.04)] flex flex-col">
          <div className="flex items-center gap-2 mb-5">
            <Milestone className="text-[#e05a2b]" size={18} />
            <h2
              className="text-lg font-bold text-[#1a263f]"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Semester Curriculum Loads
            </h2>
          </div>

          <div className="space-y-4 flex-1">
            {semesterStats.length === 0 ? (
              <p className="text-center text-xs text-[#8899b8] py-10">No semester data found.</p>
            ) : (
              semesterStats.map((sem) => (
                <div key={sem.name} className="p-4 border border-[#e8ecf4] rounded-2xl">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-extrabold text-[#1a263f]">{sem.name}</span>
                    <span className="text-xs font-bold text-[#7a8dac]">{sem.total} Modules</span>
                  </div>

                  <div className="flex gap-2 text-[10px] font-bold mt-2.5">
                    <div className="flex-1 bg-[#f0f4fc] p-2 rounded-xl text-center border border-[#dbe5fc]">
                      <span className="block text-xs font-extrabold text-[#3b7dd8]">{sem.enrolled}</span>
                      <span className="text-[#8899b8] uppercase tracking-wider text-[9px] mt-0.5 block">Enrolled</span>
                    </div>
                    <div className="flex-1 bg-[#fffbf7] p-2 rounded-xl text-center border border-[#fceeeb]">
                      <span className="block text-xs font-extrabold text-[#e05a2b]">{sem.waitlisted}</span>
                      <span className="text-[#8899b8] uppercase tracking-wider text-[9px] mt-0.5 block">Waitlist</span>
                    </div>
                    <div className="flex-1 bg-[#fbfcfd] p-2 rounded-xl text-center border border-[#f0f2f8]">
                      <span className="block text-xs font-extrabold text-[#5a6e92]">{sem.open}</span>
                      <span className="text-[#8899b8] uppercase tracking-wider text-[9px] mt-0.5 block">Open</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
