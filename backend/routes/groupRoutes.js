const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  createGroup,
  getGroups,
  getGroupById,
  joinGroup,
  leaveGroup,
  sendGroupInvite,
} = require("../controllers/groupController");
const Message = require("../models/messageModel");

const { protect } = require("../middleware/authMiddleware");

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

router.route("/").get(protect, getGroups).post(protect, createGroup);

router.post("/:id/messages", protect, async (req, res) => {
  try {
    console.log("API: Saving group message...");
    const { content } = req.body;
    const groupId = req.params.id;

    if (!content) {
      return res.status(400).json({ message: "Content is required" });
    }

    const message = await Message.create({
      group: groupId,
      sender: req.user._id,
      content,
    });
    console.log("API: Message saved:", message._id);

    const populatedMessage = await message.populate("sender", "name profilePicture");

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("API: Failed to save message:", error);
    res.status(500).json({ message: "Failed to save message" });
  }
});

router.post("/:id/messages/file", protect, upload.single("file"), async (req, res) => {
  try {
    const groupId = req.params.id;
    const { content } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const message = await Message.create({
      group: groupId,
      sender: req.user._id,
      content: content || file.originalname,
      messageType: file.mimetype.startsWith("image/") ? "image" : "file",
      filePath: file.filename,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    });

    const populatedMessage = await message.populate("sender", "name profilePicture");

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: "Failed to upload file" });
  }
});

router.get("/:id/messages", protect, async (req, res) => {
  try {
    const messages = await Message.find({ group: req.params.id })
      .populate("sender", "name profilePicture")
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});

router.route("/:id").get(protect, getGroupById);
router.route("/:id/join").post(protect, joinGroup);
router.route("/:id/leave").post(protect, leaveGroup);
router.route("/:id/invite").post(protect, sendGroupInvite);

module.exports = router;