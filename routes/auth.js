const express = require('express');
const router = express.Router();
const { signup, login, adminLogin, forgotPasswordController } = require('../controllers/authController');
const { loginMiddleware } = require('../middleware/auth');

router.post('/signup', signup);
router.post('/login', login);
router.post('/admin-login', adminLogin);
router.get('/user-auth',loginMiddleware, (req,res) => {
    res.status(200).send({ok:true}); 
})
router.post('/forgot-password', forgotPasswordController)

module.exports = router;
