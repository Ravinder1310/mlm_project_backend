const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getUserProfile, buyPackage, getReferralHistory, getUserActivity } = require('../controllers/userController');

router.get('/profile', protect, getUserProfile);
router.post('/buy-package', protect, buyPackage);
router.get('/referral-history', protect, getReferralHistory);
router.get('/user-activity', protect, getUserActivity);

module.exports = router;
