const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false }, // hide by default
    skillsOffered: { type: [String], default: [] },
    skillsRequired: { type: [String], default: [] }, 
    credits: { type: Number, default: 0 },
    location: { type: String }, // Added location
    taughtCount: { type: Number, default: 0 },
    learnedCount: { type: Number, default: 0 },
    // Personal details
    phone: { type: String },
    bio: { type: String },
    profilePicture: { type: String },
    // Educational details
    institution: { type: String },
    degree: { type: String },
    fieldOfStudy: { type: String },
    graduationYear: { type: Number },
    researchInterests: { type: [String], default: [] },
    publications: { type: [String], default: [] },
    // Learning and Academic details
    learningPreferences: { type: [String], default: [] }, // e.g., ["visual", "auditory", "kinesthetic"]
    subjectStrengths: { type: [String], default: [] }, // e.g., ["Mathematics", "Physics", "Computer Science"]
    academicGoals: { type: [String], default: [] }, // e.g., ["PhD", "Research", "Industry"]
    studyHabits: { type: [String], default: [] }, // e.g., ["morning person", "group study", "self-paced"]
    availability: { type: Object, default: {} }, // e.g., { monday: ["9-11", "2-4"], tuesday: [...] }
    // Compatibility and matching
    compatibilityScore: { type: Number, default: 0 },
    matchedUsers: { type: [String], default: [] }, // Array of user IDs
    groups: { type: [String], default: [] }, // Array of group IDs
    // Profile completion status
    profileCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
