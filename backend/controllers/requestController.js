const Request = require("../models/requestModel");
const User = require("../models/userModel");
const sendEmail = require("../utils/mailer");
const requestStatusEmailTemplate = require("../utils/emailTemplates/requestStatusEmail");

// Create request
const createRequest = async (req, res) => {
  try {
    const { receiver, skillOffered, skillRequired, scheduledDate } = req.body;

    const request = await Request.create({
      sender: req.user._id,
      receiver,
      skillOffered,
      skillRequired,
      scheduledDate
    });

    res.status(201).json(request);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Get requests
const getRequests = async (req, res) => {
  try {
    const requests = await Request.find({
      $or: [{ sender: req.user._id }, { receiver: req.user._id }]
    })
      .populate("sender receiver", "name email skillsOffered skillsRequired")
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update request status
const updateRequestStatus = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (!request.receiver.equals(req.user._id)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const newStatus = req.body.status || request.status;
    request.status = newStatus;
    await request.save();

    // Update stats if accepted
    if (newStatus === "accepted") {
      await Promise.all([
        User.findByIdAndUpdate(request.receiver, {
          $inc: { taughtCount: 1, credits: 1 }
        }),
        User.findByIdAndUpdate(request.sender, {
          $inc: { learnedCount: 1 }
        }),
      ]);
    }

    // 📧 EMAIL TO SENDER (USING TEMPLATE ✅)
    const senderUser = await User.findById(request.sender);

    if (senderUser?.email) {
      await sendEmail({
        to: senderUser.email,
        subject: "✅ Study Request Update",
        html: requestStatusEmailTemplate({
          senderName: senderUser.name,
          status: newStatus
        })
      });
    }

    res.json(request);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

module.exports = {
  createRequest,
  getRequests,
  updateRequestStatus
};
