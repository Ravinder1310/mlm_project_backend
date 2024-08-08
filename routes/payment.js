const express = require('express');
const { createOrder, verifyPayment } = require('../controllers/paymentController'); // Ensure this path is correct
const auth = require('../middleware/auth'); // Ensure this path is correct

const router = express.Router();

router.post('/create-order', auth.protect, createOrder); // Use auth.protect for authentication
router.post('/verify-payment', auth.protect, verifyPayment); // Use auth.protect for authentication

module.exports = router;
