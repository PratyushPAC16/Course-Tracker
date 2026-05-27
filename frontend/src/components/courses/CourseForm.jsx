import ActionButton from "../ui/ActionButton";
import Notice from "../ui/Notice";

export default function CourseForm({
  theme = "light",
  mode,
  values,
  loading,
  message,
  messageTone,
  onChange,
  onSubmit,
  onCancel,
}) {
  return (
    <aside
      className={`rounded-[22px] border p-5 ${
        theme === "dark" ? "border-[#38465f] bg-[#1f2a3f]" : "border-[#d9e0ef] bg-[#f9fbff]"
      }`}
    >
      <h2 className="panel-title text-2xl font-extrabold">
        {mode === "edit" ? "Edit Course" : "Add Course"}
      </h2>
      <p className="title-support mt-1 text-sm">
        {mode === "edit"
          ? "Update selected course details."
          : "Create a new course entry."}
      </p>

      <div className="mt-4">
        <Notice message={message} tone={messageTone} />
      </div>

      <form className="mt-4 space-y-4" onSubmit={onSubmit}>
        <label className={`block text-sm font-semibold ${theme === "dark" ? "text-[#d6dff3]" : "text-[#4f5e80]"}`}>
          Title
          <input
            name="title"
            value={values.title}
            onChange={onChange}
            className={`mt-2 w-full rounded-xl px-3 py-2.5 text-sm outline-none ${
              theme === "dark"
                ? "bg-[#24324b] text-[#e9efff] ring-1 ring-[#3a4b69] focus:ring-[#6f88bd]"
                : "bg-[#ffffff] text-[#243252] ring-1 ring-[#d4dced] focus:ring-[#aab9d8]"
            }`}
            placeholder="Enter course title"
          />
        </label>

        <label className={`block text-sm font-semibold ${theme === "dark" ? "text-[#d6dff3]" : "text-[#4f5e80]"}`}>
          Details
          <textarea
            name="details"
            value={values.details}
            onChange={onChange}
            rows={4}
            className={`mt-2 w-full rounded-xl px-3 py-2.5 text-sm outline-none ${
              theme === "dark"
                ? "bg-[#24324b] text-[#e9efff] ring-1 ring-[#3a4b69] focus:ring-[#6f88bd]"
                : "bg-[#ffffff] text-[#243252] ring-1 ring-[#d4dced] focus:ring-[#aab9d8]"
            }`}
            placeholder="Write course details"
          />
        </label>

        <label className={`block text-sm font-semibold ${theme === "dark" ? "text-[#d6dff3]" : "text-[#4f5e80]"}`}>
          Semester
          <input
            name="semester"
            value={values.semester}
            onChange={onChange}
            className={`mt-2 w-full rounded-xl px-3 py-2.5 text-sm outline-none ${
              theme === "dark"
                ? "bg-[#24324b] text-[#e9efff] ring-1 ring-[#3a4b69] focus:ring-[#6f88bd]"
                : "bg-[#ffffff] text-[#243252] ring-1 ring-[#d4dced] focus:ring-[#aab9d8]"
            }`}
            placeholder="e.g., Spring 2026"
          />
        </label>

        <label className={`block text-sm font-semibold ${theme === "dark" ? "text-[#d6dff3]" : "text-[#4f5e80]"}`}>
          Enroll Status
          <select
            name="enrollstatus"
            value={values.enrollstatus}
            onChange={onChange}
            className={`mt-2 w-full rounded-xl px-3 py-2.5 text-sm outline-none ${
              theme === "dark"
                ? "bg-[#24324b] text-[#e9efff] ring-1 ring-[#3a4b69] focus:ring-[#6f88bd]"
                : "bg-[#ffffff] text-[#243252] ring-1 ring-[#d4dced] focus:ring-[#aab9d8]"
            }`}
          >
            <option value="Enrolled">Enrolled</option>
            <option value="Not Enrolled">Not Enrolled</option>
            <option value="Waitlisted">Waitlisted</option>
          </select>
        </label>

        <div className="flex flex-wrap gap-2">
          <ActionButton type="submit" className="flex-1" disabled={loading}>
            {loading ? "Saving..." : mode === "edit" ? "Update Course" : "Add Course"}
          </ActionButton>
          {mode === "edit" && (
            <ActionButton type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </ActionButton>
          )}
        </div>
      </form>
    </aside>
  );
}
