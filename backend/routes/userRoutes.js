const express = require("express");
const {
  registerUser,
  loginUser,
  getMe,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getMatches,
} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");
const User = require("../models/userModel"); // ✅ ADD THIS

const router = express.Router();

// Public
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/", getUsers);

router.get("/public", async (req, res) => {
  try {
    const users = await User.find({}, "name institution fieldOfStudy profilePicture");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// Private
router.get("/me", protect, getMe);
router.get("/me/matches", protect, getMatches);

// Dynamic by-id routes
router.get("/:id", getUserById);
router.put("/:id", protect, updateUser);
router.delete("/:id", protect, deleteUser);

module.exports = router;
