const axios = require('axios');
const crypto = require('crypto');
const User = require('../models/User');
const Package = require('../models/Package');
const Transaction = require('../models/Transaction');

const API_URL = 'https://tejafinance.in/api/prod/merchant/pg/payment/initiate';
const TOKEN_URL = 'https://tejafinance.in/api/prod/merchant/getToken';
const RESPONSE_URL = 'https://tejafinance.in/pg/payment/{token}/response';

// Fetch token from the new payment service
exports.getToken = async (req, res) => {
  try {
    const headers = {
      "Content-Type": "application/json",
      "access_key": process.env.ACCESS_KEY,
      "merchant_key": process.env.MERCHANT_KEY,
      "client_id": process.env.CLIENT_ID,
      "api_password": process.env.API_PASSWORD,
    };

    console.log('Request Headers:', headers);
    console.log('Token URL:', TOKEN_URL);

    const response = await axios.post(TOKEN_URL, {}, { headers });

    console.log('API Response:', response.data);

    res.json({ token: response.data.token }); // Return the token in the response
  } catch (error) {
    console.error('Error fetching token:', error.response ? error.response.data : error.message);
    res.status(400).send('Failed to fetch token: ' + (error.response ? error.response.data.message : error.message));
  }
}



// Create a payment order
exports.createOrder = async (req, res) => {
  try {
    const { packageId } = req.body;
    const user = await User.findById(req.user.id);
    const package = await Package.findById(packageId);

    if (!package) {
      return res.status(404).json({ error: 'Package not found' });
    }

    const token = await getToken();

    const headers = {
      "Content-Type": "application/json",
      "access_key": process.env.ACCESS_KEY,
      "merchant_key": process.env.MERCHANT_KEY,
      "client_id": process.env.CLIENT_ID,
      "api_password": process.env.API_PASSWORD,
      "api_token": token,
    };

    const parameters = {
      name: user.name,
      phone: user.phone,
      email: user.email,
      amount: package.price,
      redirect_url: 'https://testapi.com/',
      response_url: 'https://testapi.com/',
    };

    const response = await axios.post(API_URL, parameters, { headers });
    res.status(200).json({ orderId: response.data.order_id }); // Adjust according to actual response
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Verify payment
exports.verifyPayment = async (req, res) => {
  try {
    const { transaction_id, pg_reference_no, packageId } = req.body;

    const token = await getToken();
    const responseUrl = RESPONSE_URL.replace('{token}', token);

    const headers = {
      "Content-Type": "application/json",
      "access_key": process.env.ACCESS_KEY,
      "merchant_key": process.env.MERCHANT_KEY,
      "client_id": process.env.CLIENT_ID,
      "api_password": process.env.API_PASSWORD,
      "api_token": token,
    };

    const parameters = {
      transaction_id,
      pg_reference_no,
    };

    const response = await axios.post(responseUrl, parameters, { headers });
    const paymentData = response.data; // Adjust according to actual response

    // Implement additional verification if needed
    if (paymentData.status !== 'success') {
      return res.status(400).json({ error: 'Payment failed' });
    }

    const user = await User.findById(req.user.id);
    const package = await Package.findById(packageId);

    if (!package) {
      return res.status(404).json({ error: 'Package not found' });
    }

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


exports.withdrawAmount = async (req, res) => {
  try {
    const { amount } = req.body;
    const user = await User.findById(req.user.id);

    if (amount < 110) {
      return res.status(400).json({ error: 'Minimum withdrawal amount is 110' });
    }

    if (user.wallet < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const deduction = amount * 0.06;
    const netAmount = amount - deduction;

    user.wallet -= amount;
    await user.save();

    // Deduction charge to admin
    const admin = await Admin.findOne(); // Assuming there's only one admin
    admin.wallet = admin.wallet ? admin.wallet + deduction : deduction;
    await admin.save();

    const transaction = new Transaction({
      user: user._id,
      amount: netAmount,
      type: 'withdrawal',
    });
    await transaction.save();

    res.status(200).json({ message: 'Withdrawal successful', netAmount });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Handle payment callback
exports.handlePaymentCallback = async (req, res) => {
  try {
    const { transaction_id, pg_reference_no, packageId } = req.body;

    const token = await getToken();
    const responseUrl = RESPONSE_URL.replace('{token}', token);

    const headers = {
      "Content-Type": "application/json",
      "access_key": process.env.ACCESS_KEY,
      "merchant_key": process.env.MERCHANT_KEY,
      "client_id": process.env.CLIENT_ID,
      "api_password": process.env.API_PASSWORD,
      "api_token": token,
    };

    const parameters = {
      transaction_id,
      pg_reference_no,
    };

    const response = await axios.post(responseUrl, parameters, { headers });
    const paymentData = response.data; // Adjust according to actual response

    if (paymentData.status !== 'success') {
      return res.status(400).json({ error: 'Payment failed' });
    }

    const user = await User.findById(req.user.id);
    const package = await Package.findById(packageId);

    if (!package) {
      return res.status(404).json({ error: 'Package not found' });
    }

    user.packages.push(package);
    user.active = true;
    user.wallet += 110; // Welcome bonus
    await user.save();

    const transaction = new Transaction({
      user: user._id,
      amount: package.price,
      type: 'deposit',
    });
    await transaction.save();

    res.status(200).json({ message: 'Payment successful', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
