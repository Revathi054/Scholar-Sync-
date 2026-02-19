const Group = require("../models/groupModel");
const User = require("../models/userModel");
const sendEmail = require("../utils/mailer");
const groupJoinEmailTemplate = require("../utils/emailTemplates/groupJoinEmail");
const groupAdminNotifyEmailTemplate = require("../utils/emailTemplates/groupAdminNotifyEmail");

// Create a new study group
const createGroup = async (req, res) => {
  try {
    const {
      name,
      description,
      subject,
      academicGoals,
      studyHabits,
      meetingSchedule,
      maxMembers
    } = req.body;

    const group = await Group.create({
      name,
      description,
      members: [req.user.id],
      admin: req.user.id,
      subject,
      academicGoals: academicGoals || [],
      studyHabits: studyHabits || [],
      meetingSchedule: meetingSchedule || {},
      maxMembers: maxMembers || 5,
      compatibilityScore: 0
    });

    await User.findByIdAndUpdate(req.user.id, {
      $push: { groups: group._id }
    });

    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all groups
const getGroups = async (req, res) => {
  try {
    const groups = await Group.find({ isActive: true })
      .populate("members", "name email institution fieldOfStudy")
      .populate("admin", "name email");

    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single group
const getGroupById = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate("members", "name email institution fieldOfStudy learningPreferences studyHabits")
      .populate("admin", "name email");

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    res.json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Join a group
const joinGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (group.members.includes(req.user.id)) {
      return res.status(400).json({ message: "Already a member" });
    }

    if (group.members.length >= group.maxMembers) {
      return res.status(400).json({ message: "Group is full" });
    }

    const currentUser = await User.findById(req.user.id);
    const members = await User.find({ _id: { $in: group.members } });

    let totalCompatibility = 0;

    members.forEach(member => {
      totalCompatibility += calculateCompatibilityScore(currentUser, member);
    });

    const avgCompatibility =
      members.length > 0 ? totalCompatibility / members.length : 0;

    group.members.push(req.user.id);

    // ✅ SAFE COMPATIBILITY SCORE CALCULATION
    const previousScore = group.compatibilityScore || 0;
    const memberCount = group.members.length;

    let newScore =
      memberCount > 0
        ? (previousScore * (memberCount - 1) + avgCompatibility) / memberCount
        : avgCompatibility;

    if (isNaN(newScore)) newScore = 0;

    group.compatibilityScore = newScore;

    await group.save();

    await User.findByIdAndUpdate(req.user.id, {
      $push: { groups: group._id }
    });

    // 📧 Email to user
    await sendEmail({
      to: currentUser.email,
      subject: "🎓 Added to Study Group",
      html: groupJoinEmailTemplate({
        userName: currentUser.name,
        groupName: group.name
      })
    });

    // 📧 Email to admin
    const admin = await User.findById(group.admin);
    if (admin?.email) {
      await sendEmail({
        to: admin.email,
        subject: "👤 New Member Joined Your Group",
        html: groupAdminNotifyEmailTemplate({
          adminName: admin.name,
          memberName: currentUser.name,
          groupName: group.name
        })
      });
    }

    res.json({
      message: "Successfully joined group",
      compatibilityScore: group.compatibilityScore
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Leave a group
const leaveGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    group.members = group.members.filter(
      member => member.toString() !== req.user.id
    );

    await group.save();

    await User.findByIdAndUpdate(req.user.id, {
      $pull: { groups: group._id }
    });

    res.json({ message: "Successfully left group" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Send group invite
const sendGroupInvite = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (group.admin.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only admin can invite" });
    }

    res.json({ message: "Invitation sent successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ FIXED COMPATIBILITY FUNCTION (NaN-PROOF)
const calculateCompatibilityScore = (user1, user2) => {
  let score = 0;
  let factors = 0;

  if (user1.fieldOfStudy && user2.fieldOfStudy) {
    factors++;
    if (
      user1.fieldOfStudy.toLowerCase() === user2.fieldOfStudy.toLowerCase()
    ) {
      score += 0.3;
    }
  }

  if (user1.researchInterests && user2.researchInterests) {
    factors++;
    const overlap = user1.researchInterests.filter(i =>
      user2.researchInterests.includes(i)
    ).length;

    score +=
      (overlap /
        Math.max(
          user1.researchInterests.length,
          user2.researchInterests.length
        )) * 0.2;
  }

  const result = factors > 0 ? score / factors : 0;
  return isNaN(result) ? 0 : result;
};

module.exports = {
  createGroup,
  getGroups,
  getGroupById,
  joinGroup,
  leaveGroup,
  sendGroupInvite,
};
