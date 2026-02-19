const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subject: { type: String }, // Main subject/topic
    academicGoals: { type: [String], default: [] },
    studyHabits: { type: [String], default: [] },
    meetingSchedule: { type: Object, default: {} }, // e.g., { frequency: "weekly", time: "saturday 10am" }
    maxMembers: { type: Number, default: 5 },
    isActive: { type: Boolean, default: true },
    compatibilityScore: { type: Number, default: 0 }, // Average compatibility of members
  },
  { timestamps: true }
);

module.exports = mongoose.model("Group", groupSchema);