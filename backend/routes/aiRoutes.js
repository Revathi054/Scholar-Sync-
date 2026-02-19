const express = require("express");
const { chatWithGroq } = require("../controllers/aiController"); // Updated import
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/chat", protect, chatWithGroq); // Updated to use new function name

module.exports = router;