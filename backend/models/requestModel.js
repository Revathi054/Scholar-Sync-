const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  skillOffered: { type: String, required: true },
  skillRequired: { type: String, required: true },
  scheduledDate: { type: Date },
  status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" }
}, { timestamps: true });

module.exports = mongoose.model("Request", requestSchema);
