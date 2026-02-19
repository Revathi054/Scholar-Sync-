const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { upload, handleUploadError } = require("../middleware/uploadMiddleware");
const Message = require("../models/messageModel");
const {
  getConversation,
  sendMessage,
  sendFileMessage,
  getConversations,
  markAsRead
} = require("../controllers/chatController");

// Get all conversations for current user
router.get("/conversations", protect, getConversations);

// Get conversation with specific user
router.get("/conversation/:userId", protect, getConversation);

// Send a message
router.post("/send", protect, sendMessage);

// Send a file message
router.post("/send-file", protect, upload.single('file'), handleUploadError, sendFileMessage);

// Mark messages as read
router.put("/read/:conversationId", protect, markAsRead);

// Serve uploaded files with security check
router.get("/file/:filename", protect, async (req, res) => {
  try {
    const { filename } = req.params;
    const userId = req.user._id;
    
    // Check if the user has access to this file
    const message = await Message.findOne({
      filePath: filename,
      $or: [
        { sender: userId },
        { receiver: userId }
      ]
    });
    
    if (!message) {
      return res.status(403).json({ message: "Access denied to this file" });
    }
    
    const path = require('path');
    const filePath = path.join(__dirname, '../uploads', filename);
    
    // Check if file exists
    const fs = require('fs');
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }
    
    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${message.fileName}"`);
    res.setHeader('Content-Type', message.mimeType || 'application/octet-stream');
    
    res.sendFile(filePath);
  } catch (error) {
    console.error('File access error:', error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;