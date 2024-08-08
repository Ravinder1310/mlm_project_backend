const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/User');
const Package = require('../models/Package');
const Transaction = require('../models/Transaction');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.createOrder = async (req, res) => {
  try {
    const { packageId } = req.body;
    const user = await User.findById(req.user.id);
    const package = await Package.findById(packageId);

    if (!package) {
      return res.status(404).json({ error: 'Package not found' });
    }

    const options = {
      amount: package.price * 100, // amount in smallest currency unit
      currency: 'INR',
      receipt: `receipt_order_${Date.now()}`,
      payment_capture: 1,
    };

    const order = await razorpay.orders.create(options);
    res.status(200).json({ orderId: order.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, packageId } = req.body;

    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(`${razorpayOrderId}|${razorpayPaymentId}`);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const user = await User.findById(req.user.id);
    const package = await Package.findById(packageId);

    user.packages.push(package);
    user.active = true;
    user.wallet += 110; // Welcome bonus
    await user.save();

    const transaction = new Transaction({
      user: user._id,
      amount: package.price,
      type: 'purchase',
      package: package._id,
    });
    await transaction.save();

    res.status(200).json({ message: 'Payment verified successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
