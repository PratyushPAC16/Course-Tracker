import { http } from "../../lib/http";

function normalizeStatus(rawStatus) {
  const status = String(rawStatus || "").toLowerCase();
  if (status.includes("not enrolled") || status.includes("completed") || status.includes("open")) {
    return "Not Enrolled";
  }
  if (status.includes("waitlist")) {
    return "Waitlisted";
  }
  return "Enrolled";
}

function mapCourse(course) {
  const enrollstatus = normalizeStatus(
    course.enrollstatus || course.enrollStatus || course.status
  );
  return {
    id: course.id,
    title: course.title || course.task || "",
    details: course.details || course.description || "",
    semester: course.semester || course.dueDate || "",
    enrollstatus,
    enrollStatus: enrollstatus,
    // Compatibility fields used by dashboard behavior.
    task: course.title || course.task || "",
    description: course.details || course.description || "",
    dueDate: course.semester || course.dueDate || "",
    status: enrollstatus,
    completed: enrollstatus === "Not Enrolled",
  };
}

async function parseOrThrow(response, fallback) {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || fallback);
  }
  return response.json();
}

export async function getCourses() {
  const response = await http("/courses");
  if (response.status === 401) {
    const error = new Error("Unauthorized");
    error.code = 401;
    throw error;
  }
  const payload = await parseOrThrow(response, "Unable to fetch courses.");
  return (payload.courses || []).map(mapCourse);
}

export async function getCourseById(courseId) {
  const response = await http(`/course/${encodeURIComponent(courseId)}`);
  if (response.status === 401) {
    const error = new Error("Unauthorized");
    error.code = 401;
    throw error;
  }
  const payload = await parseOrThrow(response, "Unable to load selected course.");
  return mapCourse(payload.course);
}

export async function createCourse(course) {
  const requestBody = {
    title: course.title,
    details: course.details,
    semester: course.semester,
    enrollstatus: course.enrollstatus,
    enrollStatus: course.enrollstatus,
  };

  const response = await http("/course", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });
  if (response.status === 401) {
    const error = new Error("Unauthorized");
    error.code = 401;
    throw error;
  }
  const payload = await parseOrThrow(response, "Unable to add course.");
  return mapCourse(payload.course);
}

export async function updateCourse(course) {
  const response = await http(`/course/${encodeURIComponent(course.id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: course.title,
      details: course.details,
      semester: course.semester,
      enrollstatus: course.enrollstatus,
      enrollStatus: course.enrollstatus,
    }),
  });
  if (response.status === 401) {
    const error = new Error("Unauthorized");
    error.code = 401;
    throw error;
  }
  const payload = await parseOrThrow(response, "Unable to update course.");
  return mapCourse(payload.course);
}

export async function removeCourse(courseId) {
  const response = await http(`/course/${encodeURIComponent(courseId)}`, {
    method: "DELETE",
  });
  if (response.status === 401) {
    const error = new Error("Unauthorized");
    error.code = 401;
    throw error;
  }
  await parseOrThrow(response, "Unable to delete course.");
}
