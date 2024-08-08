const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getUserProfile, buyPackage, withdrawAmount, getReferralHistory, getUserActivity, calculateDailyProfits } = require('../controllers/userController');

router.get('/profile', protect, getUserProfile);
router.post('/buy-package', protect, buyPackage);
router.post('/withdraw', protect, withdrawAmount);
router.get('/referral-history', protect, getReferralHistory);
router.get('/user-activity', protect, getUserActivity);
router.post('/calculate-daily-profits', protect, calculateDailyProfits);


module.exports = router;
