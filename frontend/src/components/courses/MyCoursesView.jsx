import {
  BookOpen,
  Calendar,
  Grid,
  List,
  Plus,
  Search,
  SlidersHorizontal,
  X,
  Pencil,
  Trash2,
  Bookmark,
  Activity,
  ArrowRight
} from "lucide-react";
import { useMemo, useState } from "react";
import ActionButton from "../ui/ActionButton";
import StatusPill from "../ui/StatusPill";

export default function MyCoursesView({
  courses,
  onAddCourse,
  onEditCourse,
  onDeleteCourse,
  onViewCourse,
  loading,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'list'

  // Filter courses based on search query and status filter
  const filteredCourses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return courses.filter((course) => {
      // Resolve status matching
      const status = (course.status || course.enrollstatus || "Enrolled").toLowerCase();
      let matchesFilter = true;
      if (activeFilter === "enrolled") {
        matchesFilter = status === "enrolled";
      } else if (activeFilter === "open") {
        matchesFilter = status === "open" || status === "not enrolled";
      } else if (activeFilter === "waitlisted") {
        matchesFilter = status === "waitlisted" || status === "waitlist";
      }

      if (!matchesFilter) return false;

      // Resolve query matching
      const title = (course.title || course.task || "").toLowerCase();
      const details = (course.details || course.description || "").toLowerCase();
      const semester = (course.semester || course.dueDate || "").toLowerCase();

      return (
        title.includes(query) ||
        details.includes(query) ||
        semester.includes(query)
      );
    });
  }, [courses, searchQuery, activeFilter]);

  // Compute stats for pills
  const stats = useMemo(() => {
    const counts = { all: courses.length, enrolled: 0, open: 0, waitlisted: 0 };
    courses.forEach((c) => {
      const status = (c.status || c.enrollstatus || "Enrolled").toLowerCase();
      if (status === "enrolled") counts.enrolled++;
      else if (status === "open" || status === "not enrolled") counts.open++;
      else if (status === "waitlisted" || status === "waitlist") counts.waitlisted++;
    });
    return counts;
  }, [courses]);

  // Helper to generate a deterministic mock progress value for each course
  const getMockProgress = (course) => {
    const status = (course.status || course.enrollstatus || "Enrolled").toLowerCase();
    if (status === "open" || status === "not enrolled") return 0;
    if (status === "waitlisted" || status === "waitlist") return 0;
    // Enrolled courses get a progress based on title length
    const val = ((course.title || "").length * 7) % 55 + 30; // Between 30% and 85%
    return val;
  };

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
            My Courses Management
          </h1>
          <p className="mt-1.5 text-sm text-[#7a8dac]">
            Search, filter, edit, and keep track of your curriculum progress.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddCourse}
          className="flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg self-start md:self-auto"
          style={{ background: "linear-gradient(135deg, #2b3d62, #4a6099)" }}
        >
          <Plus size={16} /> Add New Course
        </button>
      </div>

      {/* Search, Filters, and Layout Toggle */}
      <div className="bg-white rounded-2xl p-4 mb-6 shadow-sm border border-[#e8ecf4] flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9aabca]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search title, description, semester..."
            className="w-full bg-[#f5f7fc] text-sm rounded-xl pl-10 pr-10 py-2.5 outline-none border border-[#e2e6f0] text-[#1a263f] placeholder:text-[#aab5cc] focus:border-[#aab9d8] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#aab5cc] hover:text-[#1a263f] transition"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Filters & View Toggles */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-1.5 bg-[#f5f7fc] p-1 rounded-xl border border-[#e2e6f0]">
            {[
              { key: "all", label: "All", count: stats.all },
              { key: "enrolled", label: "Enrolled", count: stats.enrolled },
              { key: "open", label: "Open", count: stats.open },
              { key: "waitlisted", label: "Waitlisted", count: stats.waitlisted },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  activeFilter === tab.key
                    ? "bg-[#1a263f] text-white shadow-sm"
                    : "text-[#5a6a8a] hover:text-[#1a263f] hover:bg-[#eef2fc]"
                }`}
              >
                {tab.label}
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    activeFilter === tab.key
                      ? "bg-white/20 text-white"
                      : "bg-[#e8ecf4] text-[#5a6a8a]"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-[#e8ecf4]" />

          {/* View Toggles */}
          <div className="flex items-center gap-1 bg-[#f5f7fc] p-1 rounded-xl border border-[#e2e6f0]">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition ${
                viewMode === "grid"
                  ? "bg-white text-[#1a263f] shadow-sm"
                  : "text-[#8899b8] hover:text-[#1a263f]"
              }`}
              title="Grid view"
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition ${
                viewMode === "list"
                  ? "bg-white text-[#1a263f] shadow-sm"
                  : "text-[#8899b8] hover:text-[#1a263f]"
              }`}
              title="List view"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Courses Display */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#3b7dd8] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-sm text-[#8899b8] font-medium">Loading courses details...</p>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#e8ecf4] py-16 px-4 text-center shadow-sm">
          <div className="mx-auto w-16 h-16 bg-[#f0f3fa] rounded-full flex items-center justify-center mb-4 text-[#7a8dac]">
            <BookOpen size={28} />
          </div>
          <h3 className="text-lg font-bold text-[#1a263f]" style={{ fontFamily: "'Sora', sans-serif" }}>
            No courses found
          </h3>
          <p className="mt-1 text-sm text-[#8899b8] max-w-sm mx-auto">
            {searchQuery ? "Try modifying your search query or filter selections." : "Get started by adding your first course to the system!"}
          </p>
          {!searchQuery && (
            <button
              onClick={onAddCourse}
              className="mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white transition hover:-translate-y-0.5"
              style={{ background: "#1a263f" }}
            >
              <Plus size={14} /> Add First Course
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        // Grid View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCourses.map((course) => {
            const progress = getMockProgress(course);
            const statusLabel = getStatusLabel(course.status || course.enrollstatus);
            const statusTone = getStatusTone(course.status || course.enrollstatus);

            return (
              <div
                key={course.id}
                className="bg-white rounded-3xl border border-[#eaedf5] p-5 shadow-[0_4px_20px_rgba(30,40,80,0.04)] hover:shadow-[0_12px_30px_rgba(30,40,80,0.09)] transition-all duration-300 flex flex-col group relative overflow-hidden"
              >
                {/* Visual accent top edge */}
                <div
                  className="absolute top-0 left-0 right-0 h-1 transition-all group-hover:h-1.5"
                  style={{
                    background:
                      statusLabel === "Enrolled"
                        ? "linear-gradient(90deg, #3b7dd8, #4a6099)"
                        : statusLabel === "Waitlisted"
                        ? "linear-gradient(90deg, #e05a2b, #f3eadb)"
                        : "linear-gradient(90deg, #8899b8, #e8edf6)"
                  }}
                />

                <div className="flex items-start justify-between gap-3 mt-1.5">
                  <span className="text-xs font-bold text-[#8899b8] uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={12} className="text-[#aab5cc]" />
                    {course.semester || "No Semester"}
                  </span>
                  <StatusPill tone={statusTone}>{statusLabel}</StatusPill>
                </div>

                <h3
                  className="text-lg font-extrabold text-[#1a263f] mt-3 group-hover:text-[#3b7dd8] transition-colors line-clamp-1 cursor-pointer"
                  onClick={() => onViewCourse(course)}
                  title="View details"
                >
                  {course.title || course.task}
                </h3>

                <p className="text-xs leading-5 text-[#7a8dac] mt-2 line-clamp-2 flex-1">
                  {course.details || course.description || "No description provided."}
                </p>

                {/* Progress section (Only for Enrolled/Waitlist visually) */}
                <div className="mt-4 pt-4 border-t border-[#f5f7fc]">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="text-[#8899b8] font-medium flex items-center gap-1">
                      <Activity size={12} /> Progress
                    </span>
                    <span className="font-bold text-[#1a263f]">{progress}%</span>
                  </div>
                  <div className="w-full bg-[#f0f2f8] h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${progress}%`,
                        background:
                          statusLabel === "Enrolled"
                            ? "linear-gradient(90deg, #3b7dd8, #4a6099)"
                            : statusLabel === "Waitlisted"
                            ? "#e05a2b"
                            : "#dde3ef"
                      }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-5 flex gap-2 pt-2 border-t border-[#f5f7fc]">
                  <button
                    onClick={() => onViewCourse(course)}
                    className="flex-1 bg-[#f5f7fc] hover:bg-[#eef2fc] text-[#4a6099] rounded-xl py-2 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => onEditCourse(course)}
                    className="p-2 bg-[#f5f7fc] hover:bg-[#eef2fc] text-[#5a6e92] rounded-xl transition"
                    title="Edit Course"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => onDeleteCourse(course.id)}
                    className="p-2 bg-[#fdf2f4] hover:bg-[#fce3e7] text-[#c53030] rounded-xl transition"
                    title="Delete Course"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // List View
        <div className="bg-white rounded-3xl border border-[#eaedf5] shadow-[0_4px_20px_rgba(30,40,80,0.04)] overflow-hidden">
          <div className="divide-y divide-[#eaedf5]">
            {filteredCourses.map((course) => {
              const progress = getMockProgress(course);
              const statusLabel = getStatusLabel(course.status || course.enrollstatus);
              const statusTone = getStatusTone(course.status || course.enrollstatus);

              return (
                <div
                  key={course.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#fbfcfd] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3
                        className="text-base font-extrabold text-[#1a263f] hover:text-[#3b7dd8] cursor-pointer"
                        onClick={() => onViewCourse(course)}
                      >
                        {course.title || course.task}
                      </h3>
                      <StatusPill tone={statusTone}>{statusLabel}</StatusPill>
                      <span className="text-[11px] font-bold text-[#8899b8] uppercase tracking-wider bg-[#f5f7fc] border border-[#e2e6f0] px-2 py-0.5 rounded-md">
                        {course.semester}
                      </span>
                    </div>
                    <p className="text-xs text-[#7a8dac] mt-1.5 truncate max-w-2xl">
                      {course.details || course.description || "No description provided."}
                    </p>
                  </div>

                  {/* Progress visual in list view */}
                  <div className="w-full sm:w-44 flex flex-col justify-center shrink-0">
                    <div className="flex justify-between items-center text-[11px] mb-1">
                      <span className="text-[#8899b8]">Progress</span>
                      <span className="font-bold text-[#1a263f]">{progress}%</span>
                    </div>
                    <div className="w-full bg-[#f0f2f8] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${progress}%`,
                          background:
                            statusLabel === "Enrolled"
                              ? "#3b7dd8"
                              : statusLabel === "Waitlisted"
                              ? "#e05a2b"
                              : "#dde3ef"
                        }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      onClick={() => onViewCourse(course)}
                      className="bg-[#f5f7fc] hover:bg-[#eef2fc] text-[#4a6099] rounded-xl px-3 py-2 text-xs font-semibold transition"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => onEditCourse(course)}
                      className="p-2 bg-[#f5f7fc] hover:bg-[#eef2fc] text-[#5a6e92] rounded-xl transition"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => onDeleteCourse(course.id)}
                      className="p-2 bg-[#fdf2f4] hover:bg-[#fce3e7] text-[#c53030] rounded-xl transition"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
