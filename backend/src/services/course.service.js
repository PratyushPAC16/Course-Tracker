"use strict";

const fs = require("fs/promises");
const mongoose = require("mongoose");
const Course = require("../models/course.model");

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeEnrollStatus(input) {
  const raw = String(input || "").trim().toLowerCase();
  if (raw === "not enrolled" || raw === "completed" || raw === "done" || raw === "open") {
    return "Not Enrolled";
  }
  if (raw === "waitlisted" || raw === "waitlist") {
    return "Waitlisted";
  }
  return "Enrolled";
}

function normalizeCourse(course) {
  return {
    title: String(course.title != null ? course.title : course.task || "").trim(),
    details: String(
      course.details != null ? course.details : course.description || ""
    ).trim(),
    semester: String(course.semester != null ? course.semester : course.dueDate || "").trim(),
    enrollstatus: normalizeEnrollStatus(
      course.enrollstatus != null
        ? course.enrollstatus
        : course.enrollStatus != null
          ? course.enrollStatus
          : course.status
    ),
  };
}

function mapCourse(courseDoc) {
  const title = String(courseDoc.title != null ? courseDoc.title : courseDoc.task || "");
  const details = String(
    courseDoc.details != null ? courseDoc.details : courseDoc.description || ""
  );
  const semesterText = String(
    courseDoc.semester != null ? courseDoc.semester : courseDoc.dueDate || ""
  );
  const enrollStatus = normalizeEnrollStatus(
    courseDoc.enrollstatus != null
      ? courseDoc.enrollstatus
      : courseDoc.enrollStatus != null
        ? courseDoc.enrollStatus
        : courseDoc.status
  );

  return {
    id: String(courseDoc._id),
    title,
    details,
    semester: semesterText,
    enrollstatus: enrollStatus,
    enrollStatus,
    createdAt: courseDoc.createdAt,
    updatedAt: courseDoc.updatedAt,
    // Backward-compatible response aliases for task-mode UI.
    task: title,
    description: details,
    dueDate: semesterText,
    status: enrollStatus,
    completed: enrollStatus === "Not Enrolled",
  };
}

function validateNewCourse(payload) {
  const title = String(payload.title != null ? payload.title : payload.task || "").trim();
  const details = String(
    payload.details != null ? payload.details : payload.description || ""
  ).trim();
  const semester = String(
    payload.semester != null ? payload.semester : payload.dueDate || ""
  ).trim();
  const enrollstatus = normalizeEnrollStatus(
    payload.enrollstatus != null
      ? payload.enrollstatus
      : payload.enrollStatus != null
        ? payload.enrollStatus
        : payload.status
  );

  if (!title || !details || !semester) {
    throw createError(
      400,
      "title, details, and semester are required"
    );
  }

  return { title, details, semester, enrollstatus };
}

function ensureValidObjectId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError(400, "Invalid course id");
  }
}

async function initializeCourses(dataFilePath) {
  const existingCount = await Course.countDocuments();
  if (existingCount > 0) {
    return;
  }

  const fileContent = await fs.readFile(dataFilePath, "utf8");
  const parsed = JSON.parse(fileContent);

  if (!Array.isArray(parsed)) {
    throw createError(500, "Invalid courses data format");
  }

  const normalizedCourses = parsed.map(normalizeCourse);
  if (normalizedCourses.length > 0) {
    await Course.insertMany(normalizedCourses, { ordered: true });
  }
}

async function getAllCourses() {
  const courses = await Course.find({}).sort({ createdAt: -1 }).lean();
  return courses.map(mapCourse);
}

async function getCourseById(id) {
  ensureValidObjectId(id);
  const course = await Course.findById(id).lean();
  if (!course) {
    throw createError(404, "Course not found");
  }
  return mapCourse(course);
}

async function createCourse(payload) {
  const validPayload = validateNewCourse(payload || {});
  const newCourse = await Course.create(validPayload);
  return mapCourse(newCourse);
}

async function updateCourse(id, payload) {
  ensureValidObjectId(id);

  const current = await Course.findById(id);
  if (!current) {
    throw createError(404, "Course not found");
  }

  if (payload.task != null || payload.title != null) {
    const nextTitle = String(payload.title != null ? payload.title : payload.task).trim();
    if (nextTitle) current.title = nextTitle;
  }

  if (payload.description != null || payload.details != null) {
    const nextDetails = String(
      payload.details != null ? payload.details : payload.description
    ).trim();
    if (nextDetails) current.details = nextDetails;
  }

  if (payload.dueDate != null || payload.semester != null) {
    const nextSemester = String(
      payload.semester != null ? payload.semester : payload.dueDate
    ).trim();
    if (nextSemester) current.semester = nextSemester;
  }

  if (
    payload.status != null ||
    payload.enrollStatus != null ||
    payload.enrollstatus != null
  ) {
    current.enrollstatus = normalizeEnrollStatus(
      payload.enrollstatus != null
        ? payload.enrollstatus
        : payload.enrollStatus != null
          ? payload.enrollStatus
          : payload.status
    );
  }

  const updatedCourse = await current.save();
  return mapCourse(updatedCourse);
}

async function deleteCourse(id) {
  ensureValidObjectId(id);
  const deleted = await Course.findByIdAndDelete(id);
  if (!deleted) {
    throw createError(404, "Course not found");
  }
  return true;
}

module.exports = {
  initializeCourses,
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
};

