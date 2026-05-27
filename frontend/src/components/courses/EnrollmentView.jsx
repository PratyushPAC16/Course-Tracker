import {
  BookOpen,
  Calendar,
  CheckCircle,
  PlusCircle,
  AlertCircle,
  MinusCircle,
  TrendingUp,
  Award,
  Clock
} from "lucide-react";
import { useMemo } from "react";
import StatusPill from "../ui/StatusPill";

export default function EnrollmentView({
  courses,
  onUpdateStatus,
  loading,
}) {
  // Separate courses into categories
  const enrolledCourses = useMemo(() => {
    return courses.filter(
      (c) => (c.status || c.enrollstatus || "Enrolled").toLowerCase() === "enrolled"
    );
  }, [courses]);

  const waitlistedCourses = useMemo(() => {
    return courses.filter(
      (c) =>
        (c.status || c.enrollstatus || "").toLowerCase() === "waitlisted" ||
        (c.status || c.enrollstatus || "").toLowerCase() === "waitlist"
    );
  }, [courses]);

  const availableCourses = useMemo(() => {
    return courses.filter(
      (c) =>
        (c.status || c.enrollstatus || "").toLowerCase() === "not enrolled" ||
        (c.status || c.enrollstatus || "").toLowerCase() === "open"
    );
  }, [courses]);

  const getStatusTone = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "enrolled") return "success";
    if (s === "waitlisted" || s === "waitlist") return "warm";
    return "neutral";
  };

  const getStatusLabel = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "enrolled") return "Enrolled";
    if (s === "waitlisted" || s === "waitlist") return "Waitlisted";
    return "Open";
  };

  return (
    <div className="p-5 sm:p-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1
            className="text-3xl font-extrabold tracking-tight text-[#1a263f]"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Course Enrollment Center
          </h1>
          <p className="mt-1.5 text-sm text-[#7a8dac]">
            Enroll in open modules, drop current courses, or track your waitlist status.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-4 border border-[#e8ecf4] shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-[#eef5fc] flex items-center justify-center text-[#3b7dd8]">
            <CheckCircle size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-[#8899b8] uppercase tracking-wider">Enrolled</p>
            <p className="text-2xl font-extrabold text-[#1a263f] mt-0.5">{enrolledCourses.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#e8ecf4] shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-[#fff4f0] flex items-center justify-center text-[#e05a2b]">
            <Clock size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-[#8899b8] uppercase tracking-wider">Waitlisted</p>
            <p className="text-2xl font-extrabold text-[#1a263f] mt-0.5">{waitlistedCourses.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#e8ecf4] shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-[#f0f2f8] flex items-center justify-center text-[#5a6e92]">
            <BookOpen size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-[#8899b8] uppercase tracking-wider">Available (Open)</p>
            <p className="text-2xl font-extrabold text-[#1a263f] mt-0.5">{availableCourses.length}</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Available vs Active */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN: Available to Enroll */}
        <div className="bg-white rounded-3xl border border-[#eaedf5] p-5 shadow-[0_4px_20px_rgba(30,40,80,0.04)]">
          <div className="flex items-center gap-2 mb-4">
            <PlusCircle className="text-[#3b7dd8]" size={18} />
            <h2
              className="text-lg font-bold text-[#1a263f]"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Available Courses ({availableCourses.length})
            </h2>
          </div>

          {loading ? (
            <p className="text-center text-sm py-10 text-[#8899b8]">Updating enrollment status...</p>
          ) : availableCourses.length === 0 ? (
            <div className="py-12 px-4 text-center border-2 border-dashed border-[#e8ecf4] rounded-2xl">
              <p className="text-sm font-medium text-[#7a8dac]">No courses available for enrollment</p>
              <p className="text-xs text-[#aab5cc] mt-1">You are already enrolled or waitlisted in all active courses.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableCourses.map((course) => (
                <div
                  key={course.id}
                  className="p-4 border border-[#e8ecf4] rounded-2xl hover:border-[#3b7dd8]/30 hover:bg-[#fafbff] transition duration-200 flex items-start justify-between gap-4"
                >
                  <div className="min-w-0">
                    <h3 className="text-sm font-extrabold text-[#1a263f] truncate">
                      {course.title || course.task}
                    </h3>
                    <p className="text-xs text-[#7a8dac] line-clamp-2 mt-1">
                      {course.details || course.description || "No description provided."}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] font-bold text-[#8899b8] uppercase tracking-wider flex items-center gap-1 bg-[#f5f7fc] px-1.5 py-0.5 rounded border border-[#e2e6f0]">
                        <Calendar size={10} />
                        {course.semester}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => onUpdateStatus(course, "Enrolled")}
                    disabled={loading}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#3b7dd8] hover:bg-[#2563eb] disabled:opacity-50 transition active:scale-95 shadow-sm"
                  >
                    Enroll
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Current Enrollments & Waitlists */}
        <div className="bg-white rounded-3xl border border-[#eaedf5] p-5 shadow-[0_4px_20px_rgba(30,40,80,0.04)]">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="text-[#10b981]" size={18} />
            <h2
              className="text-lg font-bold text-[#1a263f]"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              My Current Schedule ({enrolledCourses.length + waitlistedCourses.length})
            </h2>
          </div>

          {loading ? (
            <p className="text-center text-sm py-10 text-[#8899b8]">Updating enrollment status...</p>
          ) : enrolledCourses.length === 0 && waitlistedCourses.length === 0 ? (
            <div className="py-12 px-4 text-center border-2 border-dashed border-[#e8ecf4] rounded-2xl">
              <p className="text-sm font-medium text-[#7a8dac]">Your schedule is currently empty</p>
              <p className="text-xs text-[#aab5cc] mt-1">Enroll in any of the available courses on the left panel.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Enrolled Courses */}
              {enrolledCourses.map((course) => (
                <div
                  key={course.id}
                  className="p-4 border border-[#e2e8f0] bg-[#fcfdfe] rounded-2xl flex items-start justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-extrabold text-[#1a263f] truncate">
                        {course.title || course.task}
                      </h3>
                      <StatusPill tone="success">Enrolled</StatusPill>
                    </div>
                    <p className="text-xs text-[#7a8dac] line-clamp-1 mt-1.5">
                      {course.details || course.description || "No description."}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] font-bold text-[#8899b8] uppercase tracking-wider bg-[#f5f7fc] border border-[#e2e6f0] px-1.5 py-0.5 rounded">
                        {course.semester}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => onUpdateStatus(course, "Not Enrolled")}
                    disabled={loading}
                    className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#862030] bg-[#fdf2f4] hover:bg-[#fce3e7] disabled:opacity-50 transition active:scale-95"
                    title="Withdraw from Course"
                  >
                    <MinusCircle size={12} /> Drop
                  </button>
                </div>
              ))}

              {/* Waitlisted Courses */}
              {waitlistedCourses.map((course) => (
                <div
                  key={course.id}
                  className="p-4 border border-[#f3eadb] bg-[#fffbf7] rounded-2xl flex items-start justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-extrabold text-[#1a263f] truncate">
                        {course.title || course.task}
                      </h3>
                      <StatusPill tone="warm">Waitlisted</StatusPill>
                    </div>
                    <p className="text-xs text-[#7a8dac] line-clamp-1 mt-1.5">
                      {course.details || course.description || "No description."}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] font-bold text-[#8899b8] uppercase tracking-wider bg-[#fdfaf5] border border-[#f3eadb] px-1.5 py-0.5 rounded">
                        {course.semester}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      onClick={() => onUpdateStatus(course, "Enrolled")}
                      disabled={loading}
                      className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#e05a2b] hover:bg-[#c2410c] disabled:opacity-50 transition active:scale-95"
                    >
                      Register
                    </button>
                    <button
                      onClick={() => onUpdateStatus(course, "Not Enrolled")}
                      disabled={loading}
                      className="text-center text-[10px] font-bold text-[#8899b8] hover:text-[#c53030] transition py-0.5"
                    >
                      Cancel Waitlist
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
