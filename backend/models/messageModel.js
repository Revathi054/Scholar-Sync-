const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  receiver: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group"
  },
  content: { 
    type: String, 
    required: true 
  },
  messageType: {
    type: String,
    enum: ["text", "image", "file"],
    default: "text"
  },
  fileName: {
    type: String // Original file name
  },
  filePath: {
    type: String // Stored file path
  },
  fileSize: {
    type: Number // File size in bytes
  },
  mimeType: {
    type: String // File MIME type
  },
  isRead: {
    type: Boolean,
    default: false
  },
  conversationId: {
    type: String,
  }
}, { 
  timestamps: true 
});

// Index for efficient querying
messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ group: 1, createdAt: 1 });
messageSchema.index({ sender: 1, receiver: 1 });

module.exports = mongoose.model("Message", messageSchema);