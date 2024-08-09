const express = require('express');
const { createOrder, verifyPayment, getToken, withdrawAmount, handlePaymentCallback } = require('../controllers/paymentController'); // Ensure this path is correct
const auth = require('../middleware/auth'); // Ensure this path is correct

const router = express.Router();

router.get('/get-token', getToken);
router.post('/withdrawl', auth.protect, withdrawAmount)
router.post('/create-order', auth.protect, createOrder); // Use auth.protect for authentication
router.post('/verify-payment', auth.protect, verifyPayment); // Use auth.protect for authentication
router.post('/handle-payment', auth.protect, handlePaymentCallback)

module.exports = router;
