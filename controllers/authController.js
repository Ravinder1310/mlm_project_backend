const User = require('../models/User');
const Admin = require('../models/admin.js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config();
const twilio = require('twilio');

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const generateReferralCode = () => {
  return crypto.randomBytes(4).toString('hex');
};

const generateSmsCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
};

exports.sendSmsCode = async (req, res) => {
  const { mobileNumber } = req.body;
  const smsCode = generateSmsCode();

  try {
    await twilioClient.messages.create({
      body: `Your verification code is ${smsCode}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: `+91${mobileNumber}`
    });

    res.status(200).json({ smsCode });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send SMS code' });
  }
};

exports.signup = async (req, res) => {
  try {
    const { mobileNumber, password, referredBy, answer } = req.body;
    const referralCode = generateReferralCode();
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ mobileNumber, password: hashedPassword, referralCode, referredBy, answer });
    await newUser.save();
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET);
    res.status(201).json({ token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { mobileNumber, password } = req.body;
    const user = await User.findOne({ mobileNumber });
    if (!user || !await bcrypt.compare(password, user.password)) {
      throw new Error('Invalid credentials');
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.status(200).json({ token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });
    if (!admin || !await bcrypt.compare(password, admin.password)) {
      throw new Error('Invalid credentials');
    }
    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET);
    res.status(200).json({ token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.forgotPasswordController = async (req, res) => {
  try {
    const { mobileNumber, answer, newPassword } = req.body;
    if (!mobileNumber) {
      return res.status(400).send({ message: "Phone is required" });
    }
    if (!answer) {
      return res.status(400).send({ message: "Answer is required" });
    }
    if (!newPassword) {
      return res.status(400).send({ message: "New password is required" });
    }

    const user = await User.findOne({ mobileNumber, answer });
    if (!user) {
      return res.status(404).send({
        success: false,
        message: "Wrong phone number or answer"
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(user._id, { password: hashedPassword });

    res.status(200).send({
      success: true,
      message: "Password reset successfully"
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Something went wrong",
      error
    });
  }
};
