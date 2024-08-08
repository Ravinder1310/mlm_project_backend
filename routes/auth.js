const express = require('express');
const router = express.Router();
const { signup, login, adminLogin, forgotPasswordController } = require('../controllers/authController');

router.post('/signup', signup);
router.post('/login', login);
router.post('/admin/login', adminLogin);
router.post('/forgot-password', forgotPasswordController)

module.exports = router;
