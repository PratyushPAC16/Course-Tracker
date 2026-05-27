import {
  Bell,
  BookOpen,
  ChevronDown,
  ChevronUp,
  LogOut,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Settings,
  X,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MyCoursesView from "../components/courses/MyCoursesView";
import CourseForm from "../components/courses/CourseForm";
import CourseModal from "../components/courses/CourseModal";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import Notice from "../components/ui/Notice";
import { logoutRequest } from "../features/auth/auth.service";
import { clearAuth, readAuth } from "../features/auth/auth.storage";
import {
  createCourse,
  getCourseById,
  getCourses,
  removeCourse,
  updateCourse,
} from "../features/courses/course.service";
import { DEMO_COURSES } from "../features/courses/demo.data";

/* ─── Constants ─────────────────────────────────────────────────────────── */
const EMPTY_FORM = {
  id: "",
  title: "",
  details: "",
  semester: "",
  enrollstatus: "Enrolled",
};

const NAV_LINKS = [
  { label: "Dashboard", key: "dashboard" },
  { label: "My Courses", key: "courses" },
  { label: "Enrollment", key: "enrollment" },
  { label: "Progress", key: "progress" },
];

// S M T W T F S — with Tuesday as the active "today" bar
const WEEK_BARS = [
  { label: "S", height: 55 },
  { label: "M", height: 72 },
  { label: "T", height: 130, active: true },
  { label: "W", height: 90 },
  { label: "T", height: 68 },
  { label: "F", height: 82 },
  { label: "S", height: 50 },
];

const CONNECT_PEOPLE = [
  { name: "Alex Morgan", role: "Senior Student", initials: "AM", color: "#e2522e" },
  { name: "Priya Sharma", role: "Course Advisor", initials: "PS", color: "#3b7dd8" },
];

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function validateCourse(c) {
  return String(c.title || "").trim() && String(c.details || "").trim() && String(c.semester || "").trim();
}

function resolveDemoMessage(error) {
  const msg = String(error?.message || "").toLowerCase();
  if (msg.includes("failed to fetch") || msg.includes("network") || msg.includes("fetch"))
    return "Live backend is unavailable. Demo data is enabled for review.";
  if (msg.includes("unable to fetch courses"))
    return "Unable to fetch courses from live API. Demo mode is active.";
  return error?.message || "Unable to load live courses. Demo data is enabled for UI review.";
}

function getInitial(title) {
  return String(title || "?").trim().charAt(0).toUpperCase();
}

const AVATAR_COLORS = ["#e2522e", "#3b7dd8", "#9b59b6", "#27ae60", "#e67e22", "#e91e63", "#00bcd4"];
function getAvatarColor(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = text.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/* ─── Mini progress bar chart ────────────────────────────────────────────── */
function MiniBarChart({ enrolled, open, waitlisted }) {
  const max = Math.max(enrolled, open, waitlisted, 1);
  const BAR_MAX_H = 40;
  const enrolledBars = Math.round((enrolled / max) * 6) || 0;
  const openBars = Math.round((open / max) * 6) || 0;
  const waitlistedBars = Math.round((waitlisted / max) * 6) || 0;

  function MiniCol({ count, color }) {
    return (
      <div className="flex items-end gap-[2px]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 4,
              height: BAR_MAX_H,
              borderRadius: 2,
              background: i < count ? color : "#e8ecf4",
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-4 flex gap-5 items-end">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8899b8] mb-1">Enrolled</p>
        <p className="text-2xl font-extrabold text-[#1a263f]">{enrolled}</p>
        <div className="mt-2">
          <MiniCol count={enrolledBars} color="#1a263f" />
        </div>
      </div>
      <div className="w-px self-stretch bg-[#e8ecf4] mx-1" />
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8899b8] mb-1">Open</p>
        <p className="text-2xl font-extrabold text-[#e05a2b]">{open}</p>
        <div className="mt-2">
          <MiniCol count={openBars} color="#e05a2b" />
        </div>
      </div>
      <div className="w-px self-stretch bg-[#e8ecf4] mx-1" />
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8899b8] mb-1">Waitlisted</p>
        <p className="text-2xl font-extrabold text-[#1a263f]">{waitlisted}</p>
        <div className="mt-2">
          <MiniCol count={waitlistedBars} color="#c5cce0" />
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const navigate = useNavigate();
  const auth = readAuth();

  const [courses, setCourses] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [demoMode, setDemoMode] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [listMessage, setListMessage] = useState({ text: "", tone: "error" });
  const [formMessage, setFormMessage] = useState({ text: "", tone: "error" });
  const [formState, setFormState] = useState(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, courseId: null });
  const [formOpen, setFormOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalCourse, setModalCourse] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  const isEditing = Boolean(formState.id);
  const username = auth?.username || auth?.email || "student";
  const userInitial = username.charAt(0).toUpperCase();

  useEffect(() => { loadCourseList(); }, []);

  const normalizedCourses = useMemo(() =>
    courses.map((course) => {
      const enrollStatus = String(course.enrollstatus || course.enrollStatus || course.status || "Enrolled").trim();
      const isOpen = enrollStatus.toLowerCase() === "not enrolled";
      const isWaitlisted = enrollStatus.toLowerCase() === "waitlisted";
      return {
        ...course,
        completed: isOpen,
        isWaitlisted,
        status: isOpen ? "Open" : isWaitlisted ? "Waitlisted" : "Enrolled",
        task: course.title || course.task || "",
        description: course.details || course.description || "",
        dueDate: course.semester || course.dueDate || "",
      };
    }),
    [courses]
  );

  const tabCounts = useMemo(() => {
    const open = normalizedCourses.filter((c) => c.status === "Open").length;
    const enrolled = normalizedCourses.filter((c) => c.status === "Enrolled").length;
    const waitlisted = normalizedCourses.filter((c) => c.status === "Waitlisted").length;
    return { open, enrolled, waitlisted, all: normalizedCourses.length };
  }, [normalizedCourses]);

  const filteredCourses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let result = normalizedCourses;
    if (activeFilter === "open") result = result.filter((c) => c.status === "Open");
    else if (activeFilter === "enrolled") result = result.filter((c) => c.status === "Enrolled");
    else if (activeFilter === "waitlisted") result = result.filter((c) => c.status === "Waitlisted");
    if (!query) return result;
    return result.filter((c) => {
      const t = String(c.title || c.task || "").toLowerCase();
      const d = String(c.details || c.description || "").toLowerCase();
      const s = String(c.semester || c.dueDate || "").toLowerCase();
      const st = String(c.status || "").toLowerCase();
      return t.includes(query) || d.includes(query) || s.includes(query) || st.includes(query);
    });
  }, [normalizedCourses, activeFilter, searchQuery]);

  function activateDemoMode(message) {
    setDemoMode(true);
    setCourses(DEMO_COURSES.map((item) => ({
      id: item.id,
      title: item.title || item.task,
      details: item.details || item.description,
      semester: item.semester || item.dueDate || "Spring 2026",
      enrollstatus: String(item.enrollstatus || item.enrollStatus || "").toLowerCase().includes("not") ? "Not Enrolled" : "Enrolled",
    })));
    setListMessage({ text: message || "Protected API requires login. Demo data is enabled.", tone: "info" });
  }

  async function loadCourseList() {
    setLoadingCourses(true);
    setListMessage({ text: "", tone: "error" });
    try {
      const result = await getCourses();
      setDemoMode(false);
      setCourses(result);
    } catch (error) {
      if (error.code === 401 || error.message === "Unauthorized") {
        activateDemoMode("Protected API requires login. Demo data is enabled.");
      } else {
        activateDemoMode(resolveDemoMessage(error));
      }
    } finally {
      setLoadingCourses(false);
    }
  }

  function handleFormChange(event) {
    const { name, value, type, checked } = event.target;
    setFormState((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  function resetForm() {
    setFormState(EMPTY_FORM);
    setFormMessage({ text: "", tone: "error" });
    setFormOpen(false);
  }

  function startEdit(course) {
    setFormState({
      id: course.id,
      title: course.title || course.task || "",
      details: course.details || course.description || "",
      semester: course.semester || course.dueDate || "",
      enrollstatus: course.enrollstatus || course.enrollStatus || (course.completed ? "Not Enrolled" : "Enrolled"),
    });
    setFormMessage({ text: "", tone: "error" });
    setFormOpen(true);
  }

  function openAddForm() {
    setFormState(EMPTY_FORM);
    setFormMessage({ text: "", tone: "error" });
    setFormOpen(true);
  }

  function requestDelete(courseId) { setDeleteConfirm({ open: true, courseId }); }
  function closeDeleteConfirm() { setDeleteConfirm({ open: false, courseId: null }); }

  async function handleDelete(courseId) {
    if (!courseId) return;
    setListMessage({ text: "", tone: "error" });
    setLoadingDelete(true);
    if (demoMode) {
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
      setListMessage({ text: "Course deleted in demo mode.", tone: "success" });
      if (formState.id === courseId) resetForm();
      setLoadingDelete(false);
      return;
    }
    try {
      await removeCourse(courseId);
      await loadCourseList();
      setListMessage({ text: "Course deleted successfully.", tone: "success" });
      if (formState.id === courseId) resetForm();
    } catch (error) {
      if (error.code === 401 || error.message === "Unauthorized") {
        activateDemoMode("Protected API requires login. Demo data is enabled.");
      } else {
        setListMessage({ text: error.message || "Unable to delete course.", tone: "error" });
      }
    } finally {
      setLoadingDelete(false);
    }
  }

  async function confirmDelete() {
    const id = deleteConfirm.courseId;
    closeDeleteConfirm();
    await handleDelete(id);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormMessage({ text: "", tone: "error" });
    if (!validateCourse(formState)) {
      setFormMessage({ text: "Please fill in all fields.", tone: "error" });
      return;
    }
    setLoadingSave(true);
    if (demoMode) {
      if (isEditing) {
        setCourses((prev) => prev.map((item) => (item.id === formState.id ? { ...formState } : item)));
      } else {
        setCourses((prev) => [{ ...formState, id: `demo-${Date.now()}` }, ...prev]);
      }
      setLoadingSave(false);
      resetForm();
      setFormMessage({ text: isEditing ? "Course updated in demo mode." : "Course added in demo mode.", tone: "success" });
      return;
    }
    try {
      if (isEditing) { await updateCourse(formState); } else { await createCourse(formState); }
      await loadCourseList();
      setFormMessage({ text: isEditing ? "Course updated successfully." : "Course added successfully.", tone: "success" });
      resetForm();
    } catch (error) {
      if (error.code === 401 || error.message === "Unauthorized") {
        activateDemoMode("Protected API requires login. Demo data is enabled.");
      } else {
        setFormMessage({ text: error.message || "Unable to save course.", tone: "error" });
      }
    } finally {
      setLoadingSave(false);
    }
  }

  async function handleLogout() {
    clearAuth();
    try { await logoutRequest(); } catch { /* local auth cleared */ }
    navigate("/");
  }

  const FILTER_TABS = [
    { key: "all", label: "All", count: tabCounts.all },
    { key: "enrolled", label: "Enrolled", count: tabCounts.enrolled },
    { key: "open", label: "Open", count: tabCounts.open },
    { key: "waitlisted", label: "Waitlisted", count: tabCounts.waitlisted },
  ];

  // ── The % change stat (mock based on course count)
  const changePercent = tabCounts.all > 0 ? `+${tabCounts.enrolled * 10}%` : "0%";

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6"
      style={{ background: "linear-gradient(145deg, #cdd2de 0%, #b8bfcf 100%)" }}
    >
      {/* ── Outer rounded card ──────────────────────────────────────── */}
      <div
        className="animate-rise w-full max-w-[1180px] rounded-[28px] overflow-hidden shadow-[0_32px_80px_rgba(20,30,60,0.20)]"
        style={{ background: "#f0f2f8", minHeight: "min(820px, 95vh)" }}
      >
        {/* ── NAVBAR ─────────────────────────────────────────────────── */}
        <nav
          className="flex items-center gap-3 px-6 py-3 border-b border-[#e2e6f0]"
          style={{ background: "#f7f8fd" }}
        >
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-white font-extrabold text-sm"
              style={{ background: "#e05a2b" }}
            >
              M
            </div>
            <span
              className="text-base font-extrabold tracking-tight hidden sm:block"
              style={{ color: "#1a263f", fontFamily: "'Sora', sans-serif" }}
            >
              Mentorly
            </span>
          </div>

          {/* Nav links */}
          <div className="ml-5 hidden md:flex items-center gap-0.5">
            {NAV_LINKS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveTab(item.key)}
                className="px-3.5 py-1.5 text-sm rounded-lg transition-all"
                style={activeTab === item.key
                  ? { color: "#1a263f", fontWeight: 700, background: "#eef1f9" }
                  : { color: "#7a8dac", fontWeight: 500 }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="ml-auto flex items-center gap-2 rounded-full border border-[#dde3ef] bg-white px-4 py-2 w-52 shrink-0">
            <Search size={13} className="text-[#9aabca] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses..."
              className="w-full bg-transparent text-xs outline-none text-[#1a263f] placeholder:text-[#aab5cc]"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-[#aab5cc] hover:text-[#1a263f]">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Settings icon */}
          <button
            type="button"
            className="ml-2 flex h-8 w-8 items-center justify-center rounded-full border border-[#dde3ef] bg-white text-[#7a8dac] hover:bg-[#e8edf6] transition shrink-0"
            title="Settings"
          >
            <Settings size={14} />
          </button>

          {/* Sign out button */}
          <button
            type="button"
            onClick={handleLogout}
            title="Sign out"
            className="ml-1 flex items-center gap-2 rounded-full border border-[#dde3ef] bg-white px-3 py-1.5 text-xs font-semibold text-[#374466] hover:bg-[#e8edf6] transition shrink-0"
          >
            <div
              className="flex h-5 w-5 items-center justify-center rounded-full text-white text-[10px] font-extrabold"
              style={{ background: "#3b7dd8" }}
            >
              {userInitial}
            </div>
            <span className="hidden sm:block">{username.split("@")[0]}</span>
            <LogOut size={12} className="text-[#7a8dac]" />
          </button>
        </nav>

        {/* ── BODY: two-column ───────────────────────────────────────── */}
        {activeTab === "dashboard" && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] p-5 sm:p-6 gap-5 animate-fadeIn">

          {/* ══ LEFT COLUMN ═══════════════════════════════════════════ */}
          <div className="flex flex-col gap-5">

            {/* ── Tracker card ──────────────────────────────────────── */}
            <div
              className="rounded-[20px] p-6 relative overflow-hidden"
              style={{ background: "#ffffff", boxShadow: "0 4px 24px rgba(30,40,80,0.08)" }}
            >
              {/* Week selector top-right */}
              <div className="absolute top-5 right-5 flex items-center gap-1 rounded-full border border-[#dde3ef] bg-[#f5f7fc] px-3 py-1.5 text-xs font-semibold text-[#4f5e80] cursor-default">
                Week <ChevronDown size={12} />
              </div>

              {/* Header */}
              <div className="flex items-start gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl shrink-0"
                  style={{ background: "#eef2fb" }}
                >
                  <BookOpen size={16} className="text-[#4a6099]" />
                </div>
                <div>
                  <h1
                    className="text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight"
                    style={{ color: "#1a263f", fontFamily: "'Sora', sans-serif" }}
                  >
                    My Courses Tracker
                  </h1>
                  <p className="mt-1 text-sm text-[#8899b8] max-w-sm leading-5">
                    Track changes in course enrollment over time and access detailed data on each course and semester.
                  </p>
                </div>
              </div>

              {/* Bar chart ── S M T W T F S */}
              <div className="mt-8 flex items-end justify-end gap-2 sm:gap-3 relative">
                {/* Stat on left */}
                <div className="absolute left-0 bottom-6">
                  <p className="text-4xl font-extrabold text-[#1a263f]">{changePercent}</p>
                  <p className="mt-1.5 text-xs text-[#8899b8] leading-4 w-[130px]">
                    This week's enrolled courses vs last week
                  </p>
                </div>

                {/* Bars */}
                {WEEK_BARS.map((bar, idx) => {
                  const BAR_MAX = 130;
                  const computedH = (bar.height / 130) * BAR_MAX;
                  return (
                    <div
                      key={idx}
                      className="relative flex flex-col items-center justify-end"
                      style={{ height: 190, width: 40 }}
                    >
                      {bar.active ? (
                        <>
                          {/* Tooltip bubble */}
                          <div
                            className="absolute z-20 rounded-full px-2.5 py-1 text-xs font-bold text-white shadow"
                            style={{ background: "#1a263f", bottom: computedH + 54, whiteSpace: "nowrap" }}
                          >
                            {tabCounts.all} courses
                          </div>
                          {/* Active pill background */}
                          <div
                            className="absolute rounded-t-[20px] rounded-b-[20px] w-[36px]"
                            style={{ background: "linear-gradient(180deg, #e8ecf6 0%, #d4dbee 100%)", bottom: 48, height: computedH }}
                          />
                          {/* Active circle label */}
                          <div
                            className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white shadow-lg"
                            style={{ background: "#1a263f" }}
                          >
                            {bar.label}
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Dot */}
                          <div
                            className="absolute z-10 rounded-full"
                            style={{ width: 11, height: 11, background: "#88b1ea", bottom: computedH + 48 }}
                          />
                          {/* Thin line */}
                          <div
                            className="absolute"
                            style={{ width: 1.5, background: "#c8d3e8", bottom: 48, height: computedH }}
                          />
                          {/* Inactive circle label */}
                          <div
                            className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold"
                            style={{ background: "#dfe4ef", color: "#5a6e8a" }}
                          >
                            {bar.label}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Notices */}
              {listMessage.text && (
                <div className="mt-4">
                  <Notice message={listMessage.text} tone={listMessage.tone} />
                </div>
              )}
              {demoMode && (
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#fef3dc] px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#9a6a00]">
                  <Sparkles size={11} /> Demo Mode
                </span>
              )}
            </div>

            {/* ── Let's Connect card ────────────────────────────────── */}
            <div
              className="rounded-[20px] p-5"
              style={{ background: "#ffffff", boxShadow: "0 4px 24px rgba(30,40,80,0.08)" }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-extrabold text-[#1a263f]" style={{ fontFamily: "'Sora', sans-serif" }}>
                  Let's Connect
                </h3>
                <button className="text-xs font-semibold text-[#7a8dac] hover:text-[#1a263f] transition">See all</button>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                {CONNECT_PEOPLE.map((person) => (
                  <div key={person.name} className="flex flex-1 items-center gap-3 rounded-xl border border-[#eaedf5] p-3 bg-[#f8f9fd]">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white text-sm font-extrabold"
                      style={{ background: person.color }}
                    >
                      {person.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1a263f] truncate">{person.name}</p>
                      <p className="text-xs text-[#8899b8] truncate">{person.role}</p>
                    </div>
                    <button
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#dde3ef] bg-white text-[#4a6099] hover:bg-[#e8edf6] transition"
                      title="Connect"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                ))}
              </div>
              {/* Add course CTA */}
              <button
                type="button"
                onClick={openAddForm}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg"
                style={{ background: "linear-gradient(135deg, #2b3d62, #4a6099)" }}
              >
                <Plus size={14} /> Add New Course
              </button>
            </div>
          </div>

          {/* ══ RIGHT COLUMN ══════════════════════════════════════════ */}
          <div className="flex flex-col gap-5">

            {/* ── Your Recent Courses ───────────────────────────────── */}
            <div
              className="rounded-[20px] p-5 flex flex-col"
              style={{ background: "#ffffff", boxShadow: "0 4px 24px rgba(30,40,80,0.08)" }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-extrabold text-[#1a263f]" style={{ fontFamily: "'Sora', sans-serif" }}>
                  Your Recent Courses
                </h2>
                <button
                  type="button"
                  onClick={loadCourseList}
                  disabled={loadingCourses}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#4a6099] hover:text-[#1a263f] transition disabled:opacity-50"
                >
                  <RefreshCw size={12} className={loadingCourses ? "animate-spin" : ""} />
                  See all
                </button>
              </div>

              {/* Filter tabs */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {FILTER_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveFilter(tab.key)}
                    className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-all"
                    style={
                      activeFilter === tab.key
                        ? { background: "#1a263f", color: "#fff" }
                        : { background: "#eff2f9", color: "#5a6a8a" }
                    }
                  >
                    {tab.label}
                    <span
                      className="rounded-full px-1.5 text-[10px] font-bold"
                      style={activeFilter === tab.key ? { background: "rgba(255,255,255,0.2)" } : { background: "rgba(90,106,138,0.12)" }}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Course list */}
              <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 340 }}>
                {loadingCourses && (
                  <p className="py-4 text-center text-xs text-[#8899b8]">Loading courses...</p>
                )}
                {!loadingCourses && filteredCourses.length === 0 && (
                  <p className="py-4 text-center text-xs text-[#8899b8]">
                    {searchQuery.trim() ? "No courses match your search." : "No courses yet. Add one!"}
                  </p>
                )}
                {filteredCourses.map((course) => {
                  const initial = getInitial(course.title);
                  const avatarBg = getAvatarColor(course.title || "x");
                  const isExpanded = expandedId === course.id;
                  const statusLabel = course.status;
                  const isPaid = statusLabel === "Enrolled";
                  const isOpen = statusLabel === "Open";

                  return (
                    <div
                      key={course.id}
                      className="rounded-2xl border border-[#eaedf5] overflow-hidden transition-all"
                      style={{ background: "#f8f9fd" }}
                    >
                      {/* Row */}
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white font-extrabold text-sm"
                          style={{ background: avatarBg }}
                        >
                          {initial}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-extrabold text-[#1a263f] truncate">
                              {course.title || course.task}
                            </p>
                            <span
                              className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                              style={
                                isPaid
                                  ? { background: "#d1fae5", color: "#065f46" }
                                  : isOpen
                                  ? { background: "#e0e7ff", color: "#3730a3" }
                                  : { background: "#fef9c3", color: "#854d0e" }
                              }
                            >
                              {statusLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#8899b8] mt-0.5">
                            {course.semester || course.dueDate || "—"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : course.id)}
                          className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full border border-[#dde3ef] bg-white text-[#7a8dac] hover:bg-[#e8edf6] transition"
                        >
                          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>
                      </div>

                      {/* Expanded section */}
                      {isExpanded && (
                        <div className="border-t border-[#eaedf5] px-4 pb-4 pt-3">
                          <p className="text-xs leading-5 text-[#6b7d9e]">
                            {course.details || course.description || "No description provided."}
                          </p>
                          <div className="mt-2 flex items-center gap-2 text-[10px] text-[#9aabca]">
                            <MapPin size={10} />
                            <span>Session ID: {String(course.id || "—").slice(0, 8).toUpperCase()}</span>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(course)}
                              className="rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:bg-[#dbe4f4]"
                              style={{ background: "#eef2fa", color: "#374466" }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => requestDelete(course.id)}
                              disabled={loadingDelete}
                              className="rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:bg-[#f0d9dd] disabled:opacity-60"
                              style={{ background: "#fceef0", color: "#862030" }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Course Progress card ──────────────────────────────── */}
            <div
              className="rounded-[20px] p-5"
              style={{ background: "#ffffff", boxShadow: "0 4px 24px rgba(30,40,80,0.08)" }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-[#1a263f]" style={{ fontFamily: "'Sora', sans-serif" }}>
                  Course Progress
                </h3>
                <div className="flex items-center gap-1 rounded-lg border border-[#dde3ef] bg-[#f5f7fc] px-2.5 py-1.5 text-xs font-semibold text-[#4f5e80] cursor-default">
                  <span>This semester</span>
                  <ChevronDown size={11} />
                </div>
              </div>
              <MiniBarChart
                enrolled={tabCounts.enrolled}
                open={tabCounts.open}
                waitlisted={tabCounts.waitlisted}
              />
            </div>
          </div>
        )}

        {activeTab === "courses" && (
          <MyCoursesView
            courses={normalizedCourses}
            onAddCourse={openAddForm}
            onEditCourse={startEdit}
            onDeleteCourse={requestDelete}
            onViewCourse={(course) => {
              setModalCourse(course);
              setModalOpen(true);
            }}
            loading={loadingCourses}
          />
        )}
      </div>

      {/* ── Course Form Modal ────────────────────────────────────────── */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(15,25,45,0.48)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="animate-rise w-full max-w-md rounded-[22px] shadow-2xl"
            style={{ background: "#f8f9fd" }}
          >
            <div className="flex items-center justify-between border-b border-[#dde3ef] px-6 py-4">
              <h2
                className="text-lg font-extrabold tracking-tight"
                style={{ color: "#1a263f", fontFamily: "'Sora', sans-serif" }}
              >
                {isEditing ? "Edit Course" : "Add New Course"}
              </h2>
              <button
                type="button"
                onClick={resetForm}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#7a8dac] hover:bg-[#e8edf6] transition"
              >
                <X size={15} />
              </button>
            </div>
            <div className="p-6">
              <CourseForm
                theme="light"
                mode={isEditing ? "edit" : "create"}
                values={formState}
                loading={loadingSave}
                message={formMessage.text}
                messageTone={formMessage.tone}
                onChange={handleFormChange}
                onSubmit={handleSubmit}
                onCancel={resetForm}
              />
            </div>
          </div>
        </div>
      )}

      <CourseModal
        open={modalOpen}
        course={modalCourse}
        message={modalMessage}
        onClose={() => { setModalOpen(false); setModalMessage(""); setModalCourse(null); }}
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete this course?"
        description="This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        loading={loadingDelete}
        onCancel={closeDeleteConfirm}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
