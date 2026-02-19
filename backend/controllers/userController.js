const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

const genToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

// @desc Register new user
// @route POST /api/users/register
// @access Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password, skillsOffered = [], skillsRequired = [], location} = req.body;

    // Password validation
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return res.status(400).json({ message: "Password must contain at least one lowercase letter, one uppercase letter, and one digit" });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "User already exists" });

    const user = await User.create({
      name,
      email,
      password,
      skillsOffered,
      skillsRequired,
      location
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      skillsOffered: user.skillsOffered,
      skillsRequired: user.skillsRequired,
      location: user.location,
      credits: user.credits,
      taughtCount: user.taughtCount,
      learnedCount: user.learnedCount,
      phone: user.phone,
      bio: user.bio,
      institution: user.institution,
      degree: user.degree,
      fieldOfStudy: user.fieldOfStudy,
      graduationYear: user.graduationYear,
      researchInterests: user.researchInterests,
      publications: user.publications,
      learningPreferences: user.learningPreferences,
      subjectStrengths: user.subjectStrengths,
      academicGoals: user.academicGoals,
      studyHabits: user.studyHabits,
      availability: user.availability,
      compatibilityScore: user.compatibilityScore,
      matchedUsers: user.matchedUsers,
      groups: user.groups,
      profileCompleted: user.profileCompleted,
      token: genToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Login user
// @route POST /api/users/login
// @access Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      skillsOffered: user.skillsOffered,
      skillsRequired: user.skillsRequired,
      location: user.location,
      credits: user.credits,
      taughtCount: user.taughtCount,
      learnedCount: user.learnedCount,
      phone: user.phone,
      bio: user.bio,
      institution: user.institution,
      degree: user.degree,
      fieldOfStudy: user.fieldOfStudy,
      graduationYear: user.graduationYear,
      researchInterests: user.researchInterests,
      publications: user.publications,
      learningPreferences: user.learningPreferences,
      subjectStrengths: user.subjectStrengths,
      academicGoals: user.academicGoals,
      studyHabits: user.studyHabits,
      availability: user.availability,
      compatibilityScore: user.compatibilityScore,
      matchedUsers: user.matchedUsers,
      groups: user.groups,
      profileCompleted: user.profileCompleted,
      token: genToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get current user
// @route GET /api/users/me
// @access Private
const getMe = async (req, res) => {
  res.json(req.user);
};

// @desc Get all users
// @route GET /api/users
// @access Public (you can later make it Private)
const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get single user by ID
// @route GET /api/users/:id
// @access Public
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Update user by ID
// @route PUT /api/users/:id
// @access Private (owner-only)
const updateUser = async (req, res) => {
  try {
    if (req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const updates = { ...req.body };
    if ("password" in updates) {
      const user = await User.findById(req.params.id).select("+password");
      if (!user) return res.status(404).json({ message: "User not found" });

      Object.assign(user, updates);

      const saved = await user.save();
      const clean = saved.toObject();
      delete clean.password;
      return res.status(200).json(clean);
    }

    const updated = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
      select: "-password",
    });

    if (!updated) return res.status(404).json({ message: "User not found" });
    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc Delete user by ID
// @route DELETE /api/users/:id
// @access Private (owner-only or admin later)
const deleteUser = async (req, res) => {
  try {
    if (req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMatches = async (req, res) => {
  try {
    // Get logged in user
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // First, try ML-based matching
    try {
      const axios = require('axios');
      const mlResponse = await axios.post('http://localhost:8000/match', {
        userId: req.user.id,
        top_k: 20
      });
      
      if (mlResponse.data && mlResponse.data.matches) {
        // Process ML matches and calculate compatibility scores
        const mlMatches = mlResponse.data.matches.map(match => {
          const user = match.user;
          const compatibilityScore = calculateCompatibilityScore(currentUser, user);
          return {
            _id: match.userId,
            name: user.name,
            email: user.email,
            location: user.location,
            institution: user.institution,
            fieldOfStudy: user.fieldOfStudy,
            researchInterests: user.researchInterests,
            learningPreferences: user.learningPreferences,
            subjectStrengths: user.subjectStrengths,
            academicGoals: user.academicGoals,
            studyHabits: user.studyHabits,
            availability: user.availability,
            mlScore: match.score,
            compatibilityScore: compatibilityScore,
            overallScore: (match.score * 0.6 + compatibilityScore * 0.4) * 100
          };
        });

        // Sort by overall score and return top matches
        mlMatches.sort((a, b) => b.overallScore - a.overallScore);
        return res.json(mlMatches.slice(0, 10));
      }
    } catch (mlError) {
      console.log('ML service not available, falling back to rule-based matching:', mlError.message);
    }

    // Fallback to rule-based matching if ML fails
    const users = await User.find({ _id: { $ne: currentUser._id } });

    const matches = users
      .map((u) => {
        const compatibilityScore = calculateCompatibilityScore(currentUser, u);
        
        // Also check skill matches for backward compatibility
        const offeredMatch = (u.skillsOffered || []).filter((s) =>
          (currentUser.skillsRequired || [])
            .map((x) => x.toLowerCase())
            .includes(s.toLowerCase())
        );

        const requiredMatch = (u.skillsRequired || []).filter((s) =>
          (currentUser.skillsOffered || [])
            .map((x) => x.toLowerCase())
            .includes(s.toLowerCase())
        );

        if (compatibilityScore > 0.3 || offeredMatch.length > 0 || requiredMatch.length > 0) {
          return {
            _id: u._id,
            name: u.name,
            email: u.email,
            location: u.location,
            institution: u.institution,
            fieldOfStudy: u.fieldOfStudy,
            researchInterests: u.researchInterests,
            learningPreferences: u.learningPreferences,
            subjectStrengths: u.subjectStrengths,
            academicGoals: u.academicGoals,
            studyHabits: u.studyHabits,
            availability: u.availability,
            offeredMatch,
            requiredMatch,
            compatibilityScore: compatibilityScore,
            overallScore: compatibilityScore * 100
          };
        }
        return null;
      })
      .filter((m) => m !== null)
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    res.json(matches.slice(0, 10));
    
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Calculate compatibility score based on academic and learning profiles
const calculateCompatibilityScore = (user1, user2) => {
  let score = 0;
  let factors = 0;

  // Field of Study match (high weight)
  if (user1.fieldOfStudy && user2.fieldOfStudy) {
    factors++;
    if (user1.fieldOfStudy.toLowerCase() === user2.fieldOfStudy.toLowerCase()) {
      score += 0.3;
    } else if (user1.fieldOfStudy.toLowerCase().includes(user2.fieldOfStudy.toLowerCase()) || 
               user2.fieldOfStudy.toLowerCase().includes(user1.fieldOfStudy.toLowerCase())) {
      score += 0.2;
    }
  }

  // Research Interests overlap
  if (user1.researchInterests && user2.researchInterests) {
    factors++;
    const overlap = user1.researchInterests.filter(interest => 
      user2.researchInterests.some(u2Interest => 
        u2Interest.toLowerCase().includes(interest.toLowerCase()) || 
        interest.toLowerCase().includes(u2Interest.toLowerCase())
      )
    ).length;
    score += (overlap / Math.max(user1.researchInterests.length, user2.researchInterests.length)) * 0.2;
  }

  // Learning Preferences compatibility
  if (user1.learningPreferences && user2.learningPreferences) {
    factors++;
    const commonPrefs = user1.learningPreferences.filter(pref => 
      user2.learningPreferences.includes(pref)
    ).length;
    score += (commonPrefs / Math.max(user1.learningPreferences.length, user2.learningPreferences.length)) * 0.15;
  }

  // Academic Goals alignment
  if (user1.academicGoals && user2.academicGoals) {
    factors++;
    const commonGoals = user1.academicGoals.filter(goal => 
      user2.academicGoals.some(u2Goal => 
        u2Goal.toLowerCase().includes(goal.toLowerCase()) || 
        goal.toLowerCase().includes(u2Goal.toLowerCase())
      )
    ).length;
    score += (commonGoals / Math.max(user1.academicGoals.length, user2.academicGoals.length)) * 0.15;
  }

  // Study Habits compatibility
  if (user1.studyHabits && user2.studyHabits) {
    factors++;
    const commonHabits = user1.studyHabits.filter(habit => 
      user2.studyHabits.includes(habit)
    ).length;
    score += (commonHabits / Math.max(user1.studyHabits.length, user2.studyHabits.length)) * 0.1;
  }

  // Subject Strengths complementary
  if (user1.subjectStrengths && user2.subjectStrengths) {
    factors++;
    const complementary = user1.subjectStrengths.filter(strength => 
      user2.subjectStrengths.some(u2Strength => 
        !u2Strength.toLowerCase().includes(strength.toLowerCase()) &&
        !strength.toLowerCase().includes(u2Strength.toLowerCase())
      )
    ).length;
    score += (complementary / Math.max(user1.subjectStrengths.length, user2.subjectStrengths.length)) * 0.1;
  }

  return factors > 0 ? score / factors : 0;
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getMatches,
};
