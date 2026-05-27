"use strict";

const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 140,
      index: true,
    },
    details: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    semester: {
      type: String,
      required: true,
      index: true,
      trim: true,
      minlength: 1,
      maxlength: 80,
    },
    enrollstatus: {
      type: String,
      required: true,
      enum: ["Enrolled", "Not Enrolled", "Waitlisted"],
      default: "Enrolled",
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compatibility aliases for the recent task-based UI model.
courseSchema.virtual("task")
  .get(function getTask() {
    return this.title;
  })
  .set(function setTask(value) {
    this.title = value;
  });

courseSchema.virtual("description")
  .get(function getDescription() {
    return this.details;
  })
  .set(function setDescription(value) {
    this.details = value;
  });

courseSchema.virtual("dueDate")
  .get(function getDueDate() {
    return this.semester;
  })
  .set(function setDueDate(value) {
    this.semester = value;
  });

courseSchema.virtual("status")
  .get(function getStatus() {
    return this.enrollstatus;
  })
  .set(function setStatus(value) {
    this.enrollstatus = value;
  });

courseSchema.virtual("enrollStatus")
  .get(function getEnrollStatus() {
    return this.enrollstatus;
  })
  .set(function setEnrollStatus(value) {
    this.enrollstatus = value;
  });

module.exports = mongoose.model("Course", courseSchema);

