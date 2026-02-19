const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getMatchesForUser } = require('../controllers/matchProxy');

// Get matches for current logged in user
router.get('/me', protect, async (req, res) => {
  try {
    const data = await getMatchesForUser(req.user._id.toString(), 10, req.headers.authorization?.split(' ')[1]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Match service error' });
  }
});

module.exports = router;
